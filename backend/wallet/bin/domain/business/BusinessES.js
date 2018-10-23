const Rx = require("rxjs");
const BusinessDA = require("../../data/BusinessDA");

let instance;

class BusinessES {
  constructor() {
  }

  /**
   * Persists the business on the materialized view according to the received data from the event store.
   * @param {*} businessCreatedEvent business created event
   */
  handleBusinessCreated$(businessCreatedEvent) {
    const business = businessCreatedEvent.data;
    return BusinessDA.persistBusiness$(business);
  }

  /**
   * updates the business general info on the materialized view according to the received data from the event store.
   * @param {*} businessGeneralInfoUpdatedEvent business general info updated event
   */
  handleBusinessGeneralInfoUpdated$(businessGeneralInfoUpdatedEvent) {
    const businessGeneralInfo = businessGeneralInfoUpdatedEvent.data;
    return BusinessDA.updateBusinessGeneralInfo$(
      businessGeneralInfoUpdatedEvent.aid,
      businessGeneralInfo
    );
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
