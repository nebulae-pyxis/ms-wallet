const BusinessDA = require("../../data/BusinessDA");
const LogErrorDA = require("../../data/LogErrorDA");
const WalletDA = require('../../data/WalletDA');
const WalletHelper = require("./WalletHelper");
const SpendingRulesDA = require('../../data/SpendingRulesDA');
const { mergeMap, catchError, map, defaultIfEmpty, first, tap, filter, toArray} = require('rxjs/operators');
const  { forkJoin, of, interval, from, throwError, concat, observable } = require('rxjs');
const uuidv4 = require("uuid/v4");
<<<<<<< HEAD
const [ BALANCE_POCKET, BONUS_POCKET ]  = ['BALANCE', 'BONUS'];
=======
const [ BALANCE_POCKET, BONUS_POCKET ]  = [ 'BALANCE', 'BONUS' ];
const Crosscutting = require("../../tools/Crosscutting");
>>>>>>> 56886cc24262caca252c942c39a7d6c041c7a07b
const eventSourcing = require("../../tools/EventSourcing")();
const Event = require("@nebulae/event-store").Event;

let instance;

class WalletES {
  constructor() {
  }


  /**
   * Receives a business created event and create a wallet for the business
   * @param {*} businessCreated Business created event
   */
  handleBusinessCreated$(businessCreatedEvent) {
    return of(businessCreatedEvent.data) 
    .pipe(
      map(businessCreated => {
        return {
          businessId: businessCreated._id,
          businessName: businessCreated.generalInfo.name,
          spendingState: 'FORBIDDEN',
          pockets: {
            balance: 0,
            bonus: 0
          }
        }
      }),
      mergeMap(wallet => WalletDA.createWallet$(wallet))
    )
  }

  /**
   * Receives a business created event and create a wallet for the business
   * @param {*} businessCreated Business created event
   */
  handleBusinessGeneralInfoUpdated$(businessGeneralInfoUpdatedEvent) {
    return of(businessGeneralInfoUpdatedEvent) 
    .pipe(
      mergeMap(businessGeneralInfoUpdatedEvent => WalletDA
        .updateWalletBusinessName$(businessGeneralInfoUpdatedEvent.aid, businessGeneralInfoUpdatedEvent.data.name)
      )
    );
  }
  
  handleWalletSpendingCommited$(evt){
    console.log("handleWalletSpendingCommited$");
    return of(evt.data)
    .pipe(
      mergeMap(eventData => forkJoin(
        // search the wallet for business unit
        WalletDA.getWallet$(eventData.businessId),
        // Search the spendingRule for business unit
        SpendingRulesDA.getSpendingRule$(eventData.businessId)
      )),
      // selects the pocket to use and returns => { wallet, spendingRule, selectedPocket }
      mergeMap(([wallet, spendingRule]) => this.selectPockect$(wallet, spendingRule, evt.data.value)),
      // selects the according productBonusConfig returns => { wallet, productBonusConfig, selectedPocket }
      map(result => ({...result, spendingRule: result.spendingRule.productBonusConfigs.find(e => (e.type == evt.data.type && e.concept == evt.data.concept)) })),      
      mergeMap(result => this.calculateTransactionsToExecute$(evt, result)),
      tap(r => console.log("PARA PROCESAR", JSON.stringify(r))),
    )
  }
/**
 * 
 * @param {any} evt WalletSpendingCommited Event
 * @param {Object} result Transaction object
 * @param {Object} result.wallet business unitWallet
 * @param {Object} result.wallet.pockets business unit pockets in wallet
 * @param {number} result.wallet.pockets.balance balance amount in wallet
 * @param {number} result.wallet.pockets.bonus bonus amount in wallet
 * @param {Object} result.productBonusConfig productBonus configuration
 * @param {string} result.productBonusConfig.bonusType bonustype
 * @param {number} result.productBonusConfig.BonusValueByBalance BonusValueByBalance
 * @param {number} result.productBonusConfig.BonusValueByCredit BonusValueByCredit
 * @param {string} result.selectedPocket selected pocket to use 
 * 
 */
  calculateTransactionsToExecute$(evt, result) {
    console.log("calculateTransactionsToExecute$");
    return of({
      businessId: evt.data.businessId,
      type: evt.data.type,
      concept: evt.data.concept
    })
      .pipe(
        mergeMap(tx => forkJoin(
          of(tx),
          this.calculateMainTransaction$(evt, result.selectedPocket),
          this.calculateBonusTransaction$(evt, result)
        )),
        mergeMap(([basicObj, mainTx, bonusTx]) => of({ ...basicObj, transactions: [mainTx, bonusTx].filter(e => (e != null && e != undefined) ) })),       
        // mergeMap((txToExecute) =>
        //   eventSourcing.eventStore.emitEvent$(
        //     new Event({
        //       eventType: "WalletTransactionExecuted",
        //       eventTypeVersion: 1,
        //       aggregateType: "Wallet",
        //       aggregateId: result.wallet._id,
        //       data: txToExecute,
        //       user: 'SYSTEM'
        //     })
        //   )
        // )
      )
  }

  /**
   * 
   * @param {any} evt WalletSpendingCommited Event
   * @param {String} selectedPocket Selected pocket to use in the transaction
   */
  calculateMainTransaction$(evt, selectedPocket) {
    return of({})
      .pipe(
        map(() => ({
          id: uuidv4(),
          pocket: selectedPocket,
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

  /**
   * 
   * @param {any} evt WalletSpendingCommited Event
   * @param {Object} result Transaction object
   * @param {Object} result.wallet business unitWallet
   * @param {Object} result.wallet.pockets business unit pockets in wallet
   * @param {number} result.wallet.pockets.balance balance amount in wallet
   * @param {number} result.wallet.pockets.bonus bonus amount in wallet
   * @param {Object} result.productBonusConfig productBonus configuration
   * @param {string} result.productBonusConfig.bonusType bonustype
   * @param {number} result.productBonusConfig.BonusValueByBalance BonusValueByBalance
   * @param {number} result.productBonusConfig.BonusValueByCredit BonusValueByCredit
   * @param {string} result.selectedPocket selected pocket to use 
   */
  calculateBonusTransaction$(evt, result) {
    console.log("calculateBonusTransaction$");
    return of({ evt, result })
      .pipe(
        mergeMap(() => {
          return (result.selectedPocket != BALANCE_POCKET)
            ? of(null)
            : of({}).
              pipe(
                map(() => ({ // create the basic info for transaction
                  id: uuidv4(),
                  pocket: BONUS_POCKET,
                  value: 0,
                  user: "SYSTEM"
                })),
                mergeMap( tx =>
                  forkJoin( 
                    of(tx), // keeps the basic transaction data 
                    of({    // calculate the transaction amount
                      txAmount: evt.data.value,
                      spendingRule: result.spendingRule,
                      wallet: result.wallet,
                      pocket: result.selectedPocket
                    })
                      .pipe(
                        map(data => {
                          return (data.spendingRule.bonusType == "FIXED")
                            ? (data.wallet.balance >= data.txAmount)
                              ? data.spendingRule.bonusValueByBalance
                              : data.spendingRule.bonusValueByCredit
                            : (data.wallet.balance >= data.txAmount)
                              ? (data.txAmount / 100) * data.spendingRule.bonusValueByBalance
                              : (data.txAmount / 100) * data.spendingRule.bonusValueByCredit
                          // // if bonus type is FIXED
                          // if (data.spendingRule.bonusType == "FIXED") {
                          //   return data.wallet.balance >= data.txAmount ? data.spendingRule.bonusValueByBalance : data.spendingRule.bonusValueByCredit;
                          // } else {
                          //   // if bonus type is PERCENTAGE
                          //   return data.wallet.balance >= data.txAmount ? (data.txAmount / 100) * data.spendingRule.bonusValueByBalance : (data.txAmount / 100) * data.spendingRule.bonusValueByCredit;
                          // }
                        })
                      )
                  )          
                ),
                mergeMap(([transaction, transactionValue]) => of({ ...transaction, value: transactionValue }))

              )
        }),
        // filter(() => result.selectedPocket == BALANCE_POCKET), // this flow continue only if it's using balance pocket to create the transaction
        // map(() => ({ // create the basic info for transaction
        //   id: uuidv4(),
        //   pocket: result.selectedPocket,
        //   value: 0,
        //   user: evt.user,
        //   location: evt.data.location,
        //   notes: evt.data.notes,
        //   terminal: evt.data.terminal
        // })),
        // mergeMap( tx =>
        //   forkJoin( 
        //     of(tx), // keeps the basic transaction data 
        //     of({    // calculate the transaction amount
        //       txAmount: evt.data.value,
        //       spendingRule: result.spendingRule,
        //       wallet: result.wallet,
        //       pocket: result.selectedPocket
        //     })
        //       .pipe(
        //         map(data => {
        //           return (data.spendingRule.bonusType == "FIXED")
        //             ? (data.wallet.balance >= data.txAmount)
        //               ? data.spendingRule.bonusValueByBalance
        //               : data.spendingRule.bonusValueByCredit
        //             : (data.wallet.balance >= data.txAmount)
        //               ? (data.txAmount / 100) * data.spendingRule.bonusValueByBalance
        //               : (data.txAmount / 100) * data.spendingRule.bonusValueByCredit
        //           // // if bonus type is FIXED
        //           // if (data.spendingRule.bonusType == "FIXED") {
        //           //   return data.wallet.balance >= data.txAmount ? data.spendingRule.bonusValueByBalance : data.spendingRule.bonusValueByCredit;
        //           // } else {
        //           //   // if bonus type is PERCENTAGE
        //           //   return data.wallet.balance >= data.txAmount ? (data.txAmount / 100) * data.spendingRule.bonusValueByBalance : (data.txAmount / 100) * data.spendingRule.bonusValueByCredit;
        //           // }
        //         })
        //       )
        //   )          
        // ),
        // mergeMap(([transaction, transactionValue]) => of({ ...transaction, value: transactionValue }))
      );
  }
 

  /**
   * 
   * @param {any} wallet business unit Wallet 
   * @param {any} spendingRule Business spending rules
   * @param {number} transactionAmount Transaction amount
   */
  selectPockect$(wallet, spendingRule, transactionAmount) {
    return of({})
      .pipe(
        map(() => spendingRule.autoPocketSelectionRules),
        map(rules => rules.sort((a, b) => a.priority - b.priority)),
        mergeMap(rules => 
          from(rules)
          .pipe(
            filter(pocketSelectionRule => {
            if (
              (pocketSelectionRule.when.pocket != BALANCE_POCKET && pocketSelectionRule.when.pocket != BONUS_POCKET)
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
            defaultIfEmpty({ toUse: BALANCE_POCKET }),
            first()
          )  
        ),
        map(({toUse}) =>  toUse),
        map(selectedPocket => {
          return (
            (selectedPocket == BALANCE_POCKET && wallet.pockets[selectedPocket.toLowerCase()] > 0)
            || (selectedPocket == BONUS_POCKET &&  wallet.pockets[selectedPocket.toLowerCase()] > transactionAmount )
            )
            ? selectedPocket
            : BALANCE_POCKET
        }),
        map(() => BALANCE_POCKET),
        mergeMap(selectedPocket => of({ wallet, spendingRule, selectedPocket }))
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
        const uuId = Crosscutting.generateHistoricalUuid(new Date())
        const transactions = [
          {
<<<<<<< HEAD
            id: uuidv4(),
            pocket: BALANCE_POCKET,
=======
            id: uuId,
            pocket: 'BALANCE',
>>>>>>> 56886cc24262caca252c942c39a7d6c041c7a07b
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
  createWalletTransactionExecuted(businessId, transactionType= true, transactionConcept, ...transactions){
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
        WalletHelper.checkWalletSpendingAlarms$(business)
      )),
      catchError(error => {
        console.log(`An error was generated while a walletTransactionExecuted was being processed: ${error.stack}`);
        return this.errorHandler$(walletTransactionExecuted, error.stack, 'walletTransactionExecuted');
      })
    );
  }

  /**
   * Handles and persist the errors generated.
   * @param {*} error Error stack
   * @param {*} errorType Error type (walletTransactionExecuted, ...)
   * @param {*} event settlementJobTriggered event
   */
  errorHandler$(event, error, errorType) {
    return of({ error, type: errorType, event }).mergeMap(log =>
      LogErrorDA.persistLogError$(log)
    );
  }
}

/**
 * Wallet ES consumer
 * @returns {WalletES}
 */
module.exports = () => {
  if (!instance) {
    instance = new WalletES();
    console.log("WalletES Singleton created");
  }
  return instance;
};
