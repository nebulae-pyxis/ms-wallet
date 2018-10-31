const Rx = require("rxjs");
const BusinessDA = require("../../data/BusinessDA");
const WalletDA = require('../../data/WalletDA');
const SpendingRulesDA = require('../../data/SpendingRulesDA');
const { take, mergeMap, tap, catchError, map, filter, defaultIfEmpty } = require('rxjs/operators');
const  { forkJoin, of, interval, from } = require('rxjs');
const [ BALANCE_POCKET, BONUS_POCKET ]  = [ 'BALANCE', 'BONUS' ];

let instance;

class BusinessES {
  constructor() {
  }

  
  handleWalletSpendingCommited$(evt){
    console.log(evt);
    return of(evt.data)
    .pipe(
      mergeMap(eventData => forkJoin(
        WalletDA.getWallet$(eventData.businessId),
        SpendingRulesDA.getSpendingRule$(eventData.businessId)
      )),
      mergeMap(([wallet, spendingRule]) => this.selectPockect$(wallet, spendingRule))
    )
    // return Rx.forkJoin(
    //   WalletDA.getWallet$()
    // )
  }

  selectPockect$(wallet, spendingRule){
    return of({wallet, spendingRule})
    .pipe(
      mergeMap(config => forkJoin(
        of(config.spendingRule.autoPocketSelection),
        map(rules => rules.sort((a, b) => a.priority - b.priority) ),        
        from(rules)
        .pipe(          
          filter(pocketSelectionRule => {
            switch(pocketSelectionRule){
              case 'GT': return true;
              case 'GTE': return true; 
              case 'LT': return true; 
              case 'LTE': return true; 
              case 'ENOUGH': return true;
            } 
          }),
          take(1),
          defaultIfEmpty()
        )
      ))
    )
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
