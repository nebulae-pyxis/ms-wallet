const Rx = require("rxjs");
const SpendingRulesDA = require("../../data/SpendingRulesDA");
const { take, mergeMap, catchError, map, tap } = require('rxjs/operators');
const  { forkJoin, of, interval } = require('rxjs');

let instance;

class SpendingRulesES {
  constructor() {
  }

  /**
   * Persists the business on the materialized view according to the received data from the event store.
   * @param {*} businessCreatedEvent business created event
   */
  handleBusinessCreated$(businessCreated) {
    console.log('handleBusinessCreated', businessCreated);
    return of(businessCreated) 
    .pipe(
      mergeMap(businessCreated => this.createDefaultSpendingRule$(businessCreated._id, businessCreated.generalInfo.name)),
      mergeMap(newSpendingRule => SpendingRulesDA.persistDefaultSpendingRule$(newSpendingRule) )
    )
  }


  handleBusinessGeneralInfoUpdated$(buId, buName) {
    console.log('handleBusinessGeneralInfoUpdated$', buId, buName);
    return SpendingRulesDA.updateSpendingRuleBusinessName$(buId, buName)
  }

  createDefaultSpendingRule$(buId, buName){
    return of({
      businessId: buId,
      businessName: buName,
      minAmountOperation: 100000,
      productsConfig: [],
      autoPocketSellection: [],
      lastEdition: Date.now(),
      editedBy: "SYSTEM"
    })
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
 * @returns {SpendingRulesES}
 */
module.exports = () => {
  if (!instance) {
    instance = new SpendingRulesES();
    console.log(` => ${instance.constructor.name} Singleton created` );
  }
  return instance;
};
