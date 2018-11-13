"use strict";
let mongoDB = undefined;
const COLLECTION_NAME = "Wallet";
const { CustomError } = require("../tools/customError");
const NumberDecimal = require('mongodb').Decimal128;
const { take, mergeMap, catchError, map, tap } = require('rxjs/operators');
const  { Observable, forkJoin, of, interval, defer, throwError } = require('rxjs');

const WALLET_NO_FOUND_ERROR = new CustomError('Wallet no found', 'getWallet$', 170005, 'Wallet not found with the businessId given');

class WalletDA {
  static start$(mongoDbInstance) {
    return Observable.create(observer => {
      if (mongoDbInstance) {
        mongoDB = mongoDbInstance;
        observer.next("using given mongo instance ");
      } else {
        mongoDB = require("./MongoDB").singleton();
        observer.next("using singleton system-wide mongo instance");
      }
      observer.complete();
    });
  }

  /**
   * get the wallet info by business ID
   * @param {string} businessId Business unit related
   * new NumberDecimal(wallet.pockets.balance.bytes).toString()
   */
  static getWallet$(businessId) {
    const collection = mongoDB.db.collection(COLLECTION_NAME);
    return of(businessId).pipe(
      mergeMap(id => defer(() => collection.findOne({ businessId: id }))),
      // map(r => { console.log(felipe); return r; }),
      mergeMap(wallet => wallet ? of(wallet) : throwError(WALLET_NO_FOUND_ERROR) ),
      map(wallet => 
        ({...wallet, 
          pockets:{ 
            balance: parseFloat(new NumberDecimal(wallet.pockets.balance.bytes).toString()),
            bonus: parseFloat(new NumberDecimal(wallet.pockets.bonus.bytes).toString()) 
          } 
        })
      )
    );
  }

  /**
   * Persists the wallet info . If the wallet has been already created and error will be generated.
   * @param {*} wallet 
   */
  static createWallet$(wallet) {
    const collection = mongoDB.db.collection(COLLECTION_NAME);
    return of(wallet)
    .pipe(
      mergeMap(wallet => defer(() => {
        const walletData = {
          businessId: wallet.businessId,
          businessName: wallet.businessName,
          spendingState: wallet.spendingState,
          pockets: {
            balance: NumberDecimal.fromString(wallet.pockets.balance.toString()) ,
            bonus:NumberDecimal.fromString(wallet.pockets.bonus.toString()) 
          }
        };
        return collection.insertOne(walletData);
      })),
      map(result => result.ops[0]),
      map(wallet => {
        return ({...wallet, 
          pockets:{ 
            balance: parseFloat(new NumberDecimal(wallet.pockets.balance.bytes).toString()),
            bonus: parseFloat(new NumberDecimal(wallet.pockets.bonus.bytes).toString()) 
          } 
        });
      })
    );
  }

  /**
   * updates the wallet business name.
   * @param {*} businessId ID of the business associated to the wallet
   * @param {*} newBusinessName new business name
   */
  static updateWalletBusinessName$(businessId, newBusinessName) {
    const collection = mongoDB.db.collection(COLLECTION_NAME);
    return of({businessId, newBusinessName})
    .pipe(
      mergeMap(business => defer(() => {
        const updateQuery = {
          $set: {businessName: newBusinessName}
        };
        return collection.updateOne({ businessId }, updateQuery);
      }))
    );
  }

  /**
   * update the wallet pocket values. If the wallet is not found, a new wallet will be created.
   * 
   * @param {string} business Business data
   * @param {Object} increment Indicates the increments that must be performed on the different pockets
   * @param {Object} increment.balance value to be incremented in the balance pocket
   * @param {Object} increment.bonus value to be incremented in the bonus pocket
   */
  static updateWalletPockets$(business, increment) {
    // console.log('updateWalletPockets => ', business, increment);
    const collection = mongoDB.db.collection(COLLECTION_NAME);
    return of(business)
    .pipe(
      mergeMap(business => defer(() => {
        const updateQuery = {
          $inc: {
            // 'pockets.balance': increment.balance,
            // 'pockets.bonus': increment.bonus
            'pockets.balance': NumberDecimal.fromString(increment.balance.toString()),
            'pockets.bonus': NumberDecimal.fromString(increment.bonus.toString())
          },
          $setOnInsert: {
            businessId: business._id,
            businessName: business.name,
            spendingState: 'FORBIDDEN'
          }
        };
        return collection.updateOne({ businessId: business._id }, updateQuery, {upsert: true});
      }))
    );
  }

  /**
   * Updates the spending state of the indicated business and returns the updated wallet.
   * @param {*} businessId ID of the business to update
   * @param {*} newSpendingState new spending state (ALLOWED, FORBIDDEN)
   */
  static updateWalletSpendingState$(businessId, newSpendingState) {
    console.log("updateWalletSpendingState$ ==> ", businessId, newSpendingState);
    const collection = mongoDB.db.collection(COLLECTION_NAME);
    return of({businessId, newSpendingState})
    .pipe(
      mergeMap(({businessId, newSpendingState}) => defer(() => {
        const updateQuery = {
          $set: {
            'spendingState': newSpendingState
          }
        };
        return collection.findOneAndUpdate({ businessId }, updateQuery, {returnOriginal: false});
      })),
      map(updateOperation => updateOperation.value),
      map(wallet => {
        console.log('updateWalletSpendingState => ', updateWalletSpendingState);

        return ({...wallet, 
          pockets:{ 
            balance: parseFloat(new NumberDecimal(wallet.pockets.balance.bytes).toString()),
            bonus: parseFloat(new NumberDecimal(wallet.pockets.bonus.bytes).toString()) 
          } 
        });
      })
    );
  }
}

/**
 * Returns a WalletTransactionDA
 * @returns {WalletDA}
 */
module.exports = WalletDA;
