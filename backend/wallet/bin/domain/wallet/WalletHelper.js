const WalletDA = require('../../data/WalletDA');
const SpendingRulesDA = require('../../data/SpendingRulesDA');
const WalletTransactionDA = require('../../data/WalletTransactionDA');
const { mergeMap, reduce } = require('rxjs/operators');
const  { of, from, forkJoin } = require('rxjs');
const eventSourcing = require("../../tools/EventSourcing")();
const Event = require("@nebulae/event-store").Event;

class WalletHelper {

  constructor() { }

 /**
   * Save the transactions in the transaction history collection
   * @param {*} event 
   */
  static saveTransactions$(walletTransactionExecuted){
    console.log('saveTransactions ', JSON.stringify(walletTransactionExecuted));
    return of(walletTransactionExecuted)
    .pipe(
      //Processes each transaction one by one
      mergeMap(event => from(event.data.transactions)),
      // Persist transaction
      mergeMap(transaction => {
        const transactionData = {
          _id: transaction.id,
          timestamp: walletTransactionExecuted.timestamp,
          businessId: walletTransactionExecuted.data.businessId,
          type: walletTransactionExecuted.data.transactionType,
          concept: walletTransactionExecuted.data.transactionConcept,
          pocket: transaction.pocket,
          value: transaction.value,
          user: walletTransactionExecuted.user,
          notes: transaction.notes,
          location: transaction.location,
        };

        if (transaction.terminal) {
          transactionData.terminal = {
            id: transaction.terminal.id,
            userId: transaction.terminal.userId,
            username: transaction.terminal.username,
          };
        }

        return WalletTransactionDA.saveTransactionHistory$(transactionData)
      })
    );
  }

  /**
   * Updates the value of the pockets according to the received transactions
   * @param {*} walletTransactionExecuted 
   * @param {*} business Business info
   * @returns {Observable}
   */
  static applyTransactionsOnWallet$(walletTransactionExecuted, business){
    return of(walletTransactionExecuted)
    .pipe(
      //Processes each transaction one by one
      mergeMap(event => from(event.data.transactions)),
      //Calculates the increment value from balance and bonus pockets
      reduce((acc, transaction) => {
        if(transaction.pocket.toUpperCase() == 'BALANCE'){
          acc.balance += transaction.value;
        }else if(transaction.pocket.toUpperCase() == 'BONUS'){
          acc.bonus += transaction.value;
        }else{
          throw new Error(`Invalid pocket: ${transaction.pocket}`);
        }
        return acc;
      }, {balance: 0, bonus: 0}),
      //Update wallet values
      mergeMap(increment => WalletDA.updateWalletPockets$(business, increment))
    );
  }

  /**
   * Checks if an alarm must be generated taking into account the wallet and 
   * the spending rules associated with the indicated business.
   * @param {*} business Business that will be checked
   * @return {Observable}
   */
  static checkWalletSpendingAlarms$(business){
    return of(business)
    .pipe(
      mergeMap(business => forkJoin(
        WalletDA.getWallet$(business._id),
        SpendingRulesDA.getSpendingRule$(business._id)
      )),
      mergeMap(([wallet, spendingRule]) => {
        console.log('checkWalletSpendingAlarms => ', JSON.stringify([wallet, spendingRule]));
        const debt = (wallet.pockets.balance || 0) + (wallet.pockets.bonus || 0);

        if (debt < spendingRule.minOperationAmount && wallet.spendingState == 'ALLOWED') {
          return this.changeWalletSpendingState$(wallet.businessId, 'FORBIDDEN');
        } else if (debt > spendingRule.minOperationAmount && wallet.spendingState == 'FORBIDDEN') {
          return this.changeWalletSpendingState$(wallet.businessId, 'ALLOWED');
        }else{
          return of(null);
        }
      })
    )
  }

  /**
   * Changes the spending state in the wallet and emits an alarm (FORBIDDEN, ALLOWED)
   * 
   * @param {*} business Business to which the wallet will be updated
   * @param {*} newSpendingState New spending state that will be applied to the wallet of the business
   * @return {Observable}
   */
  static changeWalletSpendingState$(business, newSpendingState){
    return of({business, newSpendingState})
    .pipe(
      //Updates the wallet spending state
      mergeMap(({business, newSpendingState}) => WalletDA.updateWalletSpendingState$(business._id, newSpendingState)),
      // Emit the wallet spending alarm
      mergeMap(updateOperation => {
        console.log('updateWalletSpendingState result => ', updateOperation);

        const updatedWallet = updateOperation.result;
        const eventType = updatedWallet.spendingState == 'FORBIDDEN' ? 'WalletSpendingForbidden': 'WalletSpendingAllowed';

        const alarm = {
          businessId: business._id,
          wallet: {
            balance: updatedWallet.pockets.balance,
            bonus: updatedWallet.pockets.bonus
          }
        };

        return eventSourcing.eventStore.emitEvent$(
          new Event({
            eventType,
            eventTypeVersion: 1,
            aggregateType: "Wallet",
            aggregateId: updatedWallet._id,
            data: alarm,
            user: 'SYSTEM'
          })
        );
      })
    );
  }

  static throwAlarm$(wallet){
    return of(wallet)
    .pipe(
      mergeMap(updateOperation => {
        console.log('updateWalletSpendingState result => ', updateOperation);

        const updatedWallet = updateOperation.result;
        const eventType = updatedWallet.spendingState == 'FORBIDDEN' ? 'WalletSpendingForbidden': 'WalletSpendingAllowed';

        const alarm = {
          businessId: business._id,
          wallet: {
            balance: updatedWallet.pockets.balance,
            bonus: updatedWallet.pockets.bonus
          }
        };

        return eventSourcing.eventStore.emitEvent$(
          new Event({
            eventType,
            eventTypeVersion: 1,
            aggregateType: "Wallet",
            aggregateId: updatedWallet._id,
            data: alarm,
            user: 'SYSTEM'
          })
        );
      })
    )    
  }


}

/**
 * Wallet helpers
 * @returns {WalletHelper}
 */
module.exports = WalletHelper;
