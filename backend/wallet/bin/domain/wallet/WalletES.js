const BusinessDA = require("../../data/BusinessDA");
const WalletDA = require('../../data/WalletDA');
const WalletHelper = require("./WalletHelper");
const SpendingRulesDA = require('../../data/SpendingRulesDA');
const { take, mergeMap, tap, catchError, map, filter, defaultIfEmpty, first} = require('rxjs/operators');
const  { forkJoin, of, interval, from, throwError } = require('rxjs');
const uuidv4 = require("uuid/v4");
const [ BALANCE_POCKET, BONUS_POCKET ]  = [ 'BALANCE', 'BONUS' ];
const eventSourcing = require("../../tools/EventSourcing")();
const Event = require("@nebulae/event-store").Event;

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
      mergeMap(([wallet, spendingRule]) => this.selectPockect$(wallet, spendingRule, evt.data.value)),
      map(result => ({...result, spendingRule: spendingRule.productBonusConfigs.find(e => (e.tpe == evt.data.type && e.concept == evt.data.concept)) })),
      mergeMap(result => this.calculateTransactionsToExecute$(evt, result))
    )
  }

  calculateTransactionsToExecute$(evt, result) {
    return of({
      businessId: evt.data.businessId,
      type: evt.data.type,
      concept: evt.data.concept
    })
      .pipe(
        mergeMap(tx =>
          forkJoin(
            of(tx),
            this.calculateMainTransaction$(evt, result),
            this.calculateBonusTransaction$(evt, result)
          ),
          mergeMap(([basicObj, mainTx, bonusTx]) => ({ ...basicObj, transactions: [mainTx, bonusTx].filter(e => (e != null && e != undefined) ) }))
        ),
        mergeMap((txToExecute) =>
          eventSourcing.eventStore.emitEvent$(
            new Event({
              eventType: "WalletTransactionExecuted",
              eventTypeVersion: 1,
              aggregateType: "Wallet",
              aggregateId: result.wallet._id,
              data: txToExecute,
              user: 'SYSTEM'
            })
          )
        )
      )
  }

  calculateMainTransaction$(evt, result) {
    return of({ evt, result })
      .pipe(
        map(() => ({
          id: uuidv4(),
          pocket: result.selectedPocket,
          value: evt.data.value * -1,
          user: evt.user,
          location: evt.data.location,
          notes: evt.data.notes,
          terminal: evt.data.terminal,
          associatedTransactionIds: []
        })
        )
      )
  }

  calculateBonusTransaction$(evt, result){
    return of({evt, result})
    .pipe(
      filter(() => result.selectedPocket == "BALANCE" ),
      map(() => ({
        id: uuidv4(),
        pocket: result.selectedPocket,
        value: 0,
        user: evt.user,
        location: evt.data.location,
        notes: evt.data.notes,
        terminal: evt.data.terminal
      })),
      mergeMap(tx => forkJoin(
        of(tx),
        of({txAmount: evt.data.value, spendingRule: result.spendingRule, wallet: result.wallet, pocket: result.selectedPocket})
        .pipe(
          mergeMap(data => {
            if(data.spendingRule.bonusType == "FIXED"){
              return (data.wallet.balance >= data.txAmount)
                ? data.spendingRule.bonusValueByBalance
                : data.spendingRule.bonusValueByCredit
            } else{
              return (data.wallet.balance >= data.txAmount)
                ? data.spendingRule.bonusValueByBalance
                : data.spendingRule.bonusValueByCredit
            }
          })
        )
      ),
      mergeMap(([transaction, transactionValue]) => ({...transaction, value: transactionValue}) )
      ),
      map(tx => ({...tx, value}) ),
      defaultIfEmpty(null)
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
                if (
                  (pocketSelectionRule.when.pocket != 'BALANCE' && pocketSelectionRule.when.pocket != 'BONUS')
                  || (pocketSelectionRule.when.comparator != 'ENOUGH' && !pocketSelectionRule.when.value)) {
                  return throwError('Error ')
                }
                switch (pocketSelectionRule.when.comparator) {
                  case 'GT': return wallet.pockets[pocketSelectionRule.when.pocket.toLowerCase()] > pocketSelectionRule.when.value                  
                  case 'GTE': return wallet.pockets[pocketSelectionRule.when.pocket.toLowerCase()] >= pocketSelectionRule.when.value                  
                  case 'LT': return wallet.pockets[pocketSelectionRule.when.pocket.toLowerCase()] < pocketSelectionRule.when.value
                  case 'LTE': return wallet.pockets[pocketSelectionRule.when.pocket.toLowerCase()] <= pocketSelectionRule.when.value
                  case 'ENOUGH': return wallet.pockets[pocketSelectionRule.when.pocket.toLowerCase()] > transactionAmount
                  default: return throwError('Invalid comparator');
                }

              }),
              defaultIfEmpty({ toUse: 'BALANCE' }),
              first(),
              map(({toUse}) =>  toUse),
              map(selectedPocket => {
                return (
                  (selectedPocket == 'BALANCE' && wallet.pockets[selectedPocket.toLowerCase()] > 0)
                  || (selectedPocket == 'BONUS' &&  wallet.pockets[selectedPocket.toLowerCase()] > transactionAmount )
                  )
                  ? selectedPocket
                  : "BALANCE"
              }),
              map(selectedPocket => ({ wallet, spendingRule, selectedPocket}))              
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
    return of(walletTransactionExecuted.data)
    .pipe(
      //Check if there are transactions to be processed
      filter(event => event.data.transactions && event.data.transactions > 0),
      //Get the business implied in the transactions
      mergeMap(event => 
        BusinessDA.getBusiness$(event.data.businessId)
        .pipe(
          map(business => ([event, business]))
        )
      ),
      mergeMap(([event, business]) => concat(
        WalletHelper.saveTransactions$(event),
        WalletHelper.applyTransactionsOnWallet$(event, business),
        WalletHelper.checkAlarms$(event)
      )),
    );
  }

  /**
   * Handles and persist the errors generated while a settlementJobTriggered was being processed.
   * @param {*} error Error
   * @param {*} event settlementJobTriggered event
   */
  errorHandler$(error, event) {
    return of({ error, event }).mergeMap(log =>
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
