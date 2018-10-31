const Rx = require("rxjs");
const BusinessDA = require("../../data/BusinessDA");
const WalletDA = require('../../data/WalletDA');
const SpendingRulesDA = require('../../data/SpendingRulesDA');
const { take, mergeMap, tap, catchError, map, filter, defaultIfEmpty, first} = require('rxjs/operators');
const  { forkJoin, of, interval, from, throwError } = require('rxjs');
const [ BALANCE_POCKET, BONUS_POCKET ]  = [ 'BALANCE', 'BONUS' ];
const uuidv4 = require("uuid/v4");

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
        SpendingRulesDA.getSpendingRule$(eventData.businessId),
        of(eventData.value)
      )),
      mergeMap(([wallet, spendingRule, value]) => this.selectPockect$(wallet, spendingRule, value)),
      mergeMap(result => this.calculateTransactionsToExecute$(evt, result))
    )
  }

  calculateTransactionsToExecute$(evt, result){
    return of({ 
      businessId: evt.data.businessId,
      type: evt.data.type,
      concept: evt.data.concept
    })
    .pipe(
      mergeMap(tx => 
        forkJoin(
        of({
          id: uuidv4(),
          pocket: result.pocketSelected,
          user: evt.user,
          location: evt.data.location,
          notes: evt.data.notes,
          terminal: evt.data.evt,
          associatedTransactionIds: []
        }),
        this.calculateMainTransaction(evt, result),
        this.calculateBonusTransaction(evt, result)
      ),
      mergeMap(([basicObj, mainTx, bonusTx]) =>   )
      ),
      map(tx => ({ ...tx, transactions: [{
        
      }]})),
      map(txToExecute => {})
    )


  }

 

  selectPockect$(wallet, spendingRule, transactionAmount) {
    return of({ wallet, spendingRule })
      .pipe(
        mergeMap(config => forkJoin(
          of(config.spendingRule.autoPocketSelection)
            .pipe(
              map(rules => rules.sort((a, b) => a.priority - b.priority)),
            )
            .pipe(
              from(rules),
              filter(pocketSelectionRule => {
                const comparator = pocketSelectionRule.when.comparator;
                if (
                  (pocketSelectionRule.when.pocket != 'BALANCE' && pocketSelectionRule.when.pocket != 'BONUS')
                  || (pocketSelectionRule.when.comparator != 'ENOUGH' && !pocketSelectionRule.when.value)) {
                  return throwError('Error ')
                }
                switch (comparator) {
                  case 'GT': {
                    return pocketSelectionRule.when.pocket == 'BALANCE'
                      ? wallet.pockets.balance > pocketSelectionRule.when.value
                      : wallet.pockets.bonus > pocketSelectionRule.when.value;
                  }
                  case 'GTE': {
                    return pocketSelectionRule.when.pocket == 'BALANCE'
                      ? wallet.pockets.balance >= pocketSelectionRule.when.value
                      : wallet.pockets.bonus >= pocketSelectionRule.when.value;
                  }
                  case 'LT': {
                    return pocketSelectionRule.when.pocket == 'BALANCE'
                      ? wallet.pockets.balance < pocketSelectionRule.when.value
                      : wallet.pockets.bonus < pocketSelectionRule.when.value;
                  }
                  case 'LTE': {
                    return pocketSelectionRule.when.pocket == 'BALANCE'
                      ? wallet.pockets.balance <= pocketSelectionRule.when.value
                      : wallet.pockets.bonus <= pocketSelectionRule.when.value;
                  }
                  case 'ENOUGH': {
                    return pocketSelectionRule.when.pocket == 'BALANCE'
                      ? wallet.pockets.balance >= transactionAmount
                      : wallet.pockets.bonus >= transactionAmount
                  }
                  default: return throwError('Invalid comparator');
                }
              }),
              first(),
              map(spendingRule => ({wallet, spendingRule, transactionAmount, pocketSelected: spendingRule.toUse })),
              defaultIfEmpty({ wallet, spendingRule, transactionAmount, pocketSelected: "BALANCE" })
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
