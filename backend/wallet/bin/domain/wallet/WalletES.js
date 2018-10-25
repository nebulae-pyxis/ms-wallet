const Rx = require("rxjs");
const BusinessDA = require("../../data/BusinessDA");
const spendingRules = require('../spending-rules');
const { take, mergeMap, tap, catchError, map } = require('rxjs/operators');
const  { forkJoin, of, interval } = require('rxjs');

let instance;

class BusinessES {
  constructor() {
  }

  

  /**
   * Handles and persist the errors generated while a settlementJobTriggered was being processed.
   * @param {*} error Error
   * @param {*} event settlementJobTriggered event
   */
  errorHandler$(error, event) {
    return Rx.Observable.of({ error, event }).mergeMap(log =>
      LogErrorDA.persistAccumulatedTransactionsError$(log)
    );
  }
}

/**
 * Business event consumer
 * @returns {BusinessES}
 */
module.exports = () => {
  if (!instance) {
    instance = new BusinessES();
    console.log("SettlementES Singleton created");
  }
  return instance;
};
