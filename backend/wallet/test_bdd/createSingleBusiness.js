// TEST LIBS
const assert = require("assert");
const uuidv4 = require("uuid/v4");
const expect = require("chai").expect;

const { take, mergeMap, catchError, map, tap, delay, toArray } = require('rxjs/operators');
const  { forkJoin, of, interval, concat, from } = require('rxjs');

//LIBS FOR TESTING
const MqttBroker = require("../bin/tools/broker/MqttBroker");
const MongoDB = require("../bin/data/MongoDB").MongoDB;

let BusinessDA = undefined;
let WalletDA = undefined;
let WalletTransactionDA = undefined;
let LogErrorDA = undefined;
let SpendingRulesDA = undefined;

//
let mongoDB = undefined;
let broker = undefined;

const dbName = `test-${uuidv4()
  .toString()
  .slice(0, 5)}-wallet`;

const environment = {
  NODE_ENV: "production",
  BROKER_TYPE: "MQTT",
  REPLY_TIMEOUT: 2000,
  GATEWAY_REPLIES_TOPIC_SUBSCRIPTION: "emi-gateway-replies-topic-mbe-wallet",
  MQTT_SERVER_URL: "mqtt://localhost:1883",
  MONGODB_URL: "mongodb://localhost:27017",
  MONGODB_DB_NAME: dbName,
  JWT_PUBLIC_KEY:
    "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAg4HWDCe7Ro6JzaX4/NQme1bmytli2MT3OkHks5Aq+2jmFYLx79p4NnzWpcG/Lc2BbBJfIEezCl/UMmgPDd9RIGGvonSmZYUx7cy0aZvDzxA1fIjczdQu5umFK5WrECDPgFri3X6O/tu6kF9hN683g822E1MRO4/47OvMfc/gEuCBwE+UWR0xqCFyskMd+qWYnMqiL/AZvthQrmhhmSn83n/e7eadh8oH3LRRfbrIPFF26FFhMrUUze/QwkUYcMPy8MMXs3SXFFEnSl3sz+gzwKphDwghPyFt5BZDcZOfMS3XHdhATmS3UlMPUOKuLNBEY9P8ocKsKO0F7ZHl0y4XRwIDAQAB\n-----END PUBLIC KEY-----",
  EVENT_STORE_BROKER_TYPE: "MQTT",
  EVENT_STORE_BROKER_EVENTS_TOPIC: "Events",
  EVENT_STORE_BROKER_URL: "mqtt://localhost:1883",
  EVENT_STORE_STORE_TYPE: "MONGO",
  EVENT_STORE_STORE_URL: "mongodb://localhost:27017",
  EVENT_STORE_STORE_AGGREGATES_DB_NAME: "Aggregates",
  EVENT_STORE_STORE_EVENTSTORE_DB_NAME: "EventStore"
};

/*
NOTES:
before run please start mongoDB:
  docker-compose up setup-rs

  remember to config /etc/hosts to resolve store-mongo1, store-mongo2, store-mongo3
    127.0.0.1 store-mongo1
    127.0.0.1 store-mongo2
    127.0.0.1 store-mongo3

*/

describe("E2E - Simple transaction", function() {
  /*
  * PREAPARE
  */
  describe("Prepare test DB and backends", function() {
    it("start wallet server", function(done) {
      this.timeout(60000);
      Object.keys(environment).forEach(envKey => {
        process.env[envKey] = environment[envKey];
        console.log(`env var set => ${envKey}:${process.env[envKey]}`);
      });

      const eventSourcing = require("../bin//tools/EventSourcing")();
      const eventStoreService = require("../bin//services/event-store/EventStoreService")();
      BusinessDA = require('../bin/data/BusinessDA');
      WalletDA = require('../bin/data/WalletDA');
      WalletTransactionDA = require('../bin/data/WalletTransactionDA');
      LogErrorDA = require('../bin/data/LogErrorDA');
      SpendingRulesDA = require('../bin/data/SpendingRulesDA');
      mongoDB = require("../bin//data/MongoDB").singleton();
      
    of({})
        .pipe(
            mergeMap(() => concat(
                eventSourcing.eventStore.start$(),
                eventStoreService.start$(),
                mongoDB.start$(),
                BusinessDA.start$(),
                WalletDA.start$(),
                WalletTransactionDA.start$(),
                LogErrorDA.start$(),
                SpendingRulesDA.start$(),
            ))
        )
        .subscribe(
            evt => {
                console.log(evt);
            },
            error => {
                console.error("Failed to start", error);
                //process.exit(1);
                return done(error);
            },
            () => {
                console.log("wallet server started");
                return done();
            }
        )
    }),

      it("start MQTT broker", function(done) {
        broker = new MqttBroker({
          mqttServerUrl: process.env.MQTT_SERVER_URL,
          replyTimeout: process.env.REPLY_TIMEOUT || 2000
        });
        done();
      });
  });


  

  /*
  * CREATE BUSINESS UNITS
  */
  describe("Create the business units", function () {
    const businessList = [{ _id: "123456789_Metro_med", name: "Metro de Medellin" }];
    it("Create one busines unit", function (done) {
      from(businessList).
      pipe( 
        delay(20),
        mergeMap(bu =>
          broker.send$("Events", "", {
            et: "BusinessCreated",
            etv: 1,
            at: "Business",
            aid: bu._id,
            data: { generalInfo: bu, _id: bu._id },
            user: "juan.santa",
            timestamp: Date.now(),
            av: 164
          })
        ),
        toArray(),
        delay(1000)
      )
      .subscribe(
        evt => console.log('business unit created'),
        error => {
          console.error(`sent message failded ${error}`);
          return done(error);
        },
        () => {
          return done();
        }
      );
    });

    it("verify its defaults documents", function(done){
      of({}).pipe(
        mergeMap(() => forkJoin(
          BusinessDA.getBusiness$(businessList[0]._id),
          SpendingRulesDA.getSpendingRule$(businessList[0]._id),
          WalletDA.getWallet$(businessList[0]._id)
        )),
        tap(([business, spendingRule, wallet]) => {

          expect(business).to.be.deep.equal({
            _id: businessList[0]._id,
            name: businessList[0].name
          });

          expect({...spendingRule, id: 0, _id: 0, lastEditionTimestamp: 0}).to.be.deep.equal({
            _id: 0,
            id: 0,
            businessId: businessList[0]._id,
            businessName: businessList[0].name,
            minOperationAmount: 0,
            lastEditionTimestamp: 0,
            editedBy: 'SYSTEM',
            productBonusConfigs: [],
            autoPocketSelectionRules: []
          });
          
          expect(spendingRule.id).to.be.equal(spendingRule.lastEditionTimestamp);

          expect({...wallet, _id: 0}).to.be.deep.equal({
            _id: 0,
            businessId: businessList[0]._id,
            businessName: businessList[0].name,
            spendingState: 'FORBIDDEN',
            pockets:{
              balance: 0,
              bonus: 0
            }
          })


        })
      )
      .subscribe(
        ok => {},
        error => {
          console.log(error);
          return done(error);
        },
        () => { console.log("Business, spendingRules and wallet documents were checked"); return done();  }
      )
      
    })

  });


  /*
  * EDIT BUSINESS UNITS
  */
 describe("Edit the business name", function () {

  const businessList = [{ _id: "123456789_Metro_med", name: "Metro de Medellin_V2" }];

  it("Edit a busines unit", function (done) {
    from(businessList).
    pipe( 
      delay(20),
      mergeMap(bu =>
        broker.send$("Events", "", {
          et: "BusinessGeneralInfoUpdated",
          etv: 1,
          at: "Business",
          aid: bu._id,
          data: { name: businessList[0].name },
          user: "juan.santa",
          timestamp: Date.now(),
          av: 164
        })
      ),
      toArray(),
      delay(1000)
    )
    .subscribe(
      evt => {},
      error => {
        console.error(`sent message failded ${error}`);
        return done(error);
      },
      () => {
        return done();
      }
    );
  });

  it("verify its defaults documents", function(done){
    of({}).pipe(
      mergeMap(() => forkJoin(
        BusinessDA.getBusiness$(businessList[0]._id),
        SpendingRulesDA.getSpendingRule$(businessList[0]._id),
        WalletDA.getWallet$(businessList[0]._id)
      )),
      tap(([business, spendingRule, wallet]) => {

        expect(business).to.be.deep.equal({
          _id: businessList[0]._id,
          name: businessList[0].name
        });

        expect({...spendingRule, id: 0, _id: 0, lastEditionTimestamp: 0}).to.be.deep.equal({
          _id: 0,
          id: 0,
          businessId: businessList[0]._id,
          businessName: businessList[0].name,
          minOperationAmount: 0,
          lastEditionTimestamp: 0,
          editedBy: 'SYSTEM',
          productBonusConfigs: [],
          autoPocketSelectionRules: []
        });
        
        expect(spendingRule.id).to.be.equal(spendingRule.lastEditionTimestamp);

        expect({...wallet, _id: 0}).to.be.deep.equal({
          _id: 0,
          businessId: businessList[0]._id,
          businessName: businessList[0].name,
          spendingState: 'FORBIDDEN',
          pockets:{
            balance: 0,
            bonus: 0
          }
        })


      })
    )
    .subscribe(
      ok => {},
      error => {
        console.log(error);
        return done(error);
      },
      () => { console.log("Business, spendingRules and wallet documents were checked"); return done();  }
    )


    
  })

});


describe("Update SpendingRule", function(){
  const businessList = [{ _id: "123456789_Metro_med", name: "Metro de Medellin_V2" }];
  let beforeSpendingRule = undefined;
  let afterSpendingRule = undefined;

  it("Update minOperationAmount", function(done){
    of({})
    .pipe(
      mergeMap(() => SpendingRulesDA.getSpendingRule$(businessList[0]._id)), // get the current spendingRule
      tap(spendingRule => beforeSpendingRule = spendingRule),
      map(({businessId, minOperationAmount, productBonusConfigs, autoPocketSelectionRules }) => {
        return { businessId,
                minOperationAmount: -750000,
                productBonusConfigs, autoPocketSelectionRules 
        }
      }),
      // give a debt capacity to 750.000
      mergeMap( spendingRuleUpdate => broker.send$("Events", "", {
        et: "SpendingRuleUpdated",
        etv: 1,
        at: "SpendingRule",
        aid: businessList[0]._id,
        data: {input: spendingRuleUpdate},
        user: "juan.santa",
        timestamp: Date.now(),
        av: 164
      })
      ),
      delay(1000),
      mergeMap(() => SpendingRulesDA.getSpendingRule$(businessList[0]._id)), // get the current spendingRule
      tap(spendingRule => afterSpendingRule = spendingRule),
      tap(() => {
        expect(beforeSpendingRule.minOperationAmount).to.be.equal(0);
        expect(afterSpendingRule.minOperationAmount).to.be.equal(-750000);
        expect(afterSpendingRule.editedBy).to.be.equal('juan.santa');

      })
    )
    .subscribe( evt => {}, error => done(error), () => done() );
  }),

  it("Insert a new productBonusConfig", function(done){
    const productBonusConfigs = [
      {
        type: 'VENTA',
        concept: 'RECARGA_CIVICA',
        bonusType: 'PERCENTAGE',
        bonusValueByBalance: 1.38,
        bonusValueByCredit: 1.17
      }
    ];

    of({})
    .pipe(
      mergeMap(() => SpendingRulesDA.getSpendingRule$(businessList[0]._id)), // get the current spendingRule
      tap(spendingRule => beforeSpendingRule = spendingRule),
      map(({ businessId, autoPocketSelectionRules }) => {
        return { businessId,
                minOperationAmount: -1250000,
                productBonusConfigs,
                autoPocketSelectionRules 
        }
      }),
      // give a debt capacity to 750.000
      mergeMap( spendingRuleUpdate => broker.send$("Events", "", {
        et: "SpendingRuleUpdated",
        etv: 1,
        at: "SpendingRule",
        aid: businessList[0]._id,
        data: {input: spendingRuleUpdate},
        user: "juan.santa",
        timestamp: Date.now(),
        av: 164
      })
      ),
      delay(1000),
      mergeMap(() => SpendingRulesDA.getSpendingRule$(businessList[0]._id)), // get the current spendingRule
      tap(spendingRule => afterSpendingRule = spendingRule),
      tap(() => {
        expect(beforeSpendingRule.minOperationAmount).to.be.equal(-750000);
        expect(afterSpendingRule.minOperationAmount).to.be.equal(-1250000);
        expect(afterSpendingRule.productBonusConfigs).to.be.length(1, 'Must to be just one element here');
        expect(afterSpendingRule.productBonusConfigs[0]).to.be.deep.equal({
          type: 'VENTA',
          concept: 'RECARGA_CIVICA',
          bonusType: 'PERCENTAGE',
          bonusValueByBalance: 1.38,
          bonusValueByCredit: 1.17
        });
        expect(afterSpendingRule.editedBy).to.be.equal('juan.santa');

      })
    )
    .subscribe( evt => {}, error => done(error), () => done() );
  }),

  it("remove all productBonusConfigs items", function(done){
    const productBonusConfigs = [];
    of({})
    .pipe(
      mergeMap(() => SpendingRulesDA.getSpendingRule$(businessList[0]._id)), // get the current spendingRule
      tap(spendingRule => beforeSpendingRule = spendingRule),
      map(({ businessId, autoPocketSelectionRules }) => 
         ({ businessId,
            minOperationAmount: 0,
            productBonusConfigs,
            autoPocketSelectionRules  
          })
      ),
      // give a debt capacity to 750.000
      mergeMap( spendingRuleUpdate => broker.send$("Events", "", {
        et: "SpendingRuleUpdated",
        etv: 1,
        at: "SpendingRule",
        aid: businessList[0]._id,
        data: {input: spendingRuleUpdate},
        user: "juan.santa",
        timestamp: Date.now(),
        av: 164
      })
      ),
      delay(1000),
      mergeMap(() => SpendingRulesDA.getSpendingRule$(businessList[0]._id)), // get the current spendingRule
      tap(spendingRule => afterSpendingRule = spendingRule),
      tap(() => {
        expect(beforeSpendingRule.minOperationAmount).to.be.equal(-1250000);
        expect(afterSpendingRule.minOperationAmount).to.be.equal(0);
        expect(afterSpendingRule.productBonusConfigs).to.be.length(0, 'Must to be an empty array');
        expect(afterSpendingRule.editedBy).to.be.equal('juan.santa');
      })
    )
    .subscribe( evt => {}, error => done(error), () => done() );
  }),


  it("Insert a new autoPocketSelectionRules ", function(done){
    const autoPocketSelectionRules = [
      {
        priority: 1,
        pocketToUse: 'BALANCE',
        condition:{
          pocket: 'BALANCE',
          comparator: 'GTE',
          value: 250000
        }
      }
    ];

    of({})
    .pipe(
      mergeMap(() => SpendingRulesDA.getSpendingRule$(businessList[0]._id)), // get the current spendingRule
      tap(spendingRule => beforeSpendingRule = spendingRule),
      map(({ businessId, minOperationAmount, productBonusConfigs }) => 
        ({  businessId,
            minOperationAmount,
            productBonusConfigs,
            autoPocketSelectionRules 
        })
      ),
      mergeMap( spendingRuleUpdate => broker.send$("Events", "", {
        et: "SpendingRuleUpdated",
        etv: 1,
        at: "SpendingRule",
        aid: businessList[0]._id,
        data: {input: spendingRuleUpdate},
        user: "juan.santa",
        timestamp: Date.now(),
        av: 164
      })
      ),
      delay(1000),
      mergeMap(() => SpendingRulesDA.getSpendingRule$(businessList[0]._id)), // get the current spendingRule
      tap(spendingRule => afterSpendingRule = spendingRule),
      tap(() => {        
        expect(afterSpendingRule.editedBy).to.be.equal('juan.santa');
        expect(afterSpendingRule.autoPocketSelectionRules).to.be.deep.equal(autoPocketSelectionRules);
      })
    )
    .subscribe( evt => {}, error => done(error), () => done() );
  }),

  it("delete all autoPocketSelectionRules ", function(done){
    const autoPocketSelectionRules = [ ];

    of({})
    .pipe(
      mergeMap(() => SpendingRulesDA.getSpendingRule$(businessList[0]._id)), // get the current spendingRule
      tap(spendingRule => beforeSpendingRule = spendingRule),
      map(({ businessId, minOperationAmount, productBonusConfigs }) => 
        ({  businessId,
            minOperationAmount,
            productBonusConfigs,
            autoPocketSelectionRules 
        })
      ),
      mergeMap( spendingRuleUpdate => broker.send$("Events", "", {
        et: "SpendingRuleUpdated",
        etv: 1,
        at: "SpendingRule",
        aid: businessList[0]._id,
        data: {input: spendingRuleUpdate},
        user: "juan.santa",
        timestamp: Date.now(),
        av: 164
      })
      ),
      delay(1000),
      mergeMap(() => SpendingRulesDA.getSpendingRule$(businessList[0]._id)), // get the current spendingRule
      tap(spendingRule => afterSpendingRule = spendingRule),
      tap(() => {        
        expect(afterSpendingRule.editedBy).to.be.equal('juan.santa');
        expect(afterSpendingRule.autoPocketSelectionRules).to.be.deep.equal([]);
      })
    )
    .subscribe( evt => {}, error => done(error), () => done() );
  })



})

  /*
  * DE-PREAPARE
  */

  describe("de-prepare test DB", function() {
    it("delete mongoDB", function(done) {
      this.timeout(8000);
      of({})
      .pipe(
          delay(5000),
          mergeMap(() => mongoDB.dropDB$())
      )
      .subscribe(
        evt => console.log(`${evt}`),
        error => {
          console.error(`Mongo DropDB failed: ${error}`);
          return done(error);
        },
        () => {
          return done();
        }
      );      
    });
    it("stop mongo", function(done) {
      this.timeout(4000);
      of({})
      .pipe(
        delay(1000),
        mergeMap(() => mongoDB.stop$() )
      )
      .subscribe(
        evt => console.log(`Mongo Stop: ${evt}`),
        error => {
          console.error(`Mongo Stop failed: ${error}`);
          return done(error);
        },
        () => {
          return done();
        }
      );       
    });
  });


});
