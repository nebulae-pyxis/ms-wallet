const BusinessDA = require("../../data/BusinessDA");
const WalletDA = require('../../data/WalletDA');
const SpendingRulesDA = require('../../data/SpendingRulesDA');
const { take, mergeMap, tap, catchError, map, filter, defaultIfEmpty, first} = require('rxjs/operators');
const  { forkJoin, of, interval, from, throwError } = require('rxjs');
const uuidv4 = require("uuid/v4");
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
   * Takes the wallet deposit commited events, generates the corresponding transactions and emits an walletTransactionExecuted
   * 
   * @param {*} walletDepositCommitedEvent 
   */
  handleWalletDepositCommited$(walletDepositCommitedEvent){
    console.log('handleWalletDepositCommited => ', walletDepositCommitedEvent);
    return of(walletDepositCommitedEvent)
    .pipe(
      //Create wallet execute transaction
      map(({data, user}) => {
        const transactions = [
          {
            id: uuidv4(),
            pocket: 'BALANCE',
            value: data.value,
            notes: data.notes,            
            user,            
          }
        ];
        return this.createWalletTransactionExecuted(walletDepositCommited.businessId, 'BALANCE_ADJUSTMENT', 'PAYMENT', transactions);
      }),
      //Get wallet of the implied business
      mergeMap(walletTransactionExecuted => WalletDA.getWallet$(walletDepositCommitedEvent.businessId).pipe(map(wallet => [wallet, walletTransactionExecuted]))),
      //Emit the wallet transaction executed
      mergeMap(([wallet, walletTransactionExecuted]) => {            
        return eventSourcing.eventStore.emitEvent$(
          new Event({
            eventType: 'WalletTransactionExecuted',
            eventTypeVersion: 1,
            aggregateType: "Wallet",
            aggregateId: wallet._id,
            data: walletTransactionExecuted,
            user: 'SYSTEM'
          })
        );
      })
    )
  }

  /**
   * Creates a wallet transaction executed event
   * @param {string} businessId ID of the business implied in the wallet deposit.
   * @param {string} transactionType Transaction type (E.g SALE, PAYMENT, ...)
   * @param {string} transactionConcept Transaction concept (E.g CIVICARECARGA, ...)
   * @param {Object[]} transactions Transaction object
   * @param {string} transactions[].id Transaction ID
   * @param {string} transactions[].pocket Pocket where the transaction will be applied
   * @param {number} transactions[].value Value that will be increment or decrement in the pocket indicated in the transaction
   * @param {string} transactions[].user User that performed the operation that caused this transaction.
   * @param {GeoJSON} [transactions[].location] Location object
   * @param {GeoJSON} [transactions[].location.geojson] GeoJSON object
   * @param {string} [transactions[].location.geojson.type] GeoJSON type (E.g Point, LineString, ...)
   * @param {number[]} [transactions[].location.geojson.coordinates] Coordinates given according to the used geojson type
   * @param {string} [transactions[].notes] Additional data related with the transaction
   * @param {string} [transactions[].terminal] Terminal object (info which refers to the terminal where the transaction was performed)
   * @param {string} [transactions[].terminal.id] Terminal ID
   * @param {string} [transactions[].terminal.userId] Terminal user ID
   * @param {string} [transactions[].terminal.username] Terminal username
   * @param {string[]} [transactions[].associatedTransactionIds] Id that refers to the transactions related with this one.
   */
  createWalletTransactionExecuted(businessId, transactionType, transactionConcept, ...transactions){
    return {
      businessId,
      transactionType,
      transactionConcept,
      transactions: transactions
    }
  }

    /**
   * Takes the wallet transaction executed events and performs three operations:
   * 1. persists transactions in a transaction history collection.   
   * 2. Applies increments and decrements over the implied pockets
   * 3. Checks pockets of the business to see if an alarm should be generated (WalletSpendingAllowed, WalletSpendingForbidden).
   * 
   * These operations are done in the above order to avoid problems in case that an error occurred. 
   * Therefore if an error ocurred the wallet of the implied business will not be updated and the error will be recorded.
   * 
   * @param {*} walletTransactionExecuted wallet transaction executed event
   */
  handleWalletTransactionExecuted$(walletTransactionExecuted){
    console.log('handleWalletTransactionExecuted => ', walletTransactionExecuted);
    return of(walletTransactionExecuted)
    .pipe(
      
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
 * @returns {BusinessES} BusinessES
 */
module.exports = () => {
  if (!instance) {
    instance = new BusinessES();
    console.log("SettlementES Singleton created");
  }
  return instance;
};
