"use strict";

const Rx = require("rxjs");
const HelloWorldDA = require("../data/HelloWorldDA");
const broker = require("../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";
const { take, mergeMap, catchError, map } = require('rxjs/operators');
const {
  CustomError,
  DefaultError
} = require("../tools/customError");

/**
 * Singleton instance
 */
let instance;

class HelloWorld {
  constructor() {
    this.initHelloWorldEventGenerator();
  }

  /**
   *  HelloWorld Query, please remove
   *  this is a queiry form GraphQL
   */
  getHelloWorld$(request) {
    console.log(`request: request`)
    return HelloWorldDA.getHelloWorld$().pipe(
      mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      ,catchError(err => this.errorHandler$(err)) 
    );
  }

  /**
   * Handle HelloWorld Query, please remove
   * This in an Event HAndler for Event- events
   */
  handleHelloWorld$(evt) {
    return Rx.of('Some process for HelloWorld event');
  }


  initHelloWorldEventGenerator(){
    Rx.interval(1000).pipe(
      take(2)
      ,mergeMap(id =>  HelloWorldDA.getHelloWorld$())    
      ,mergeMap(evt => {
        return broker.send$(MATERIALIZED_VIEW_TOPIC, 'walletHelloWorldEvent',evt);
      })
    )
    .subscribe(
      (evt) => console.log('emi-gateway GraphQL sample event sent, please remove'),
      (err) => { 
        console.log(err);
        console.error('emi-gateway GraphQL sample event sent ERROR, please remove')
      },
      () => console.log('emi-gateway GraphQL sample event sending STOPPED, please remove'),
    );
  }




  //#region  mappers for API responses
  errorHandler$(err) {
    return Rx.of(err).pipe(
      map(err => {
        const exception = { data: null, result: {} };
        const isCustomError = err instanceof CustomError;
        if(!isCustomError){
          err = new DefaultError(err)
        }
        exception.result = {
            code: err.code,
            error: {...err.getContent()}
          }
        return exception;
      }  
    )
    );
  }

  
  buildSuccessResponse$(rawRespponse) {
    return Rx.of(rawRespponse)
      .pipe(
        map(resp => {
          return {
            data: resp,
            result: {
              code: 200
            }
          }
        })
      );
  }

  //#endregion


}

/**
 * @returns {HelloWorld}
 */
module.exports = () => {
  if (!instance) {
    instance = new HelloWorld();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
