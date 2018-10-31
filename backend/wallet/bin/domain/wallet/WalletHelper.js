const WalletDA = require('../../data/WalletDA');
const WalletTransactionDA = require('../../data/WalletTransactionDA');
const { mergeMap, reduce } = require('rxjs/operators');
const  { of, from } = require('rxjs');

class WalletHelper {

  constructor() { }

 /**
   * Save the transactions in the transaction history collection
   * @param {*} event 
   */
  static saveTransactions$(walletTransactionExecuted){
    return of(walletTransactionExecuted)
    .pipe(
      //Processes each transaction one by one
      mergeMap(event => from(event.data.transactions)),
      // Persist transaction
      mergeMap(transaction => {
        const transactionData = {
          _id: event.id,
          timestamp: walletTransactionExecuted.data.timestamp,
          businessId: transaction.businessId,
          type: walletTransactionExecuted.data.data.type,
          concept: walletTransactionExecuted.data.data.concept,
          value: walletTransactionExecuted.data.data.value,
          terminal: {
            id: walletTransactionExecuted.data.data.terminal.id,
            id: walletTransactionExecuted.data.data.terminal.userId,
            id: walletTransactionExecuted.data.data.terminal.username
          },
          user: walletTransactionExecuted.data.data.user,
          notes: walletTransactionExecuted.data.data.notes,
          location: walletTransactionExecuted.data.data.location,
        };

        return WalletTransactionDA.saveTransactionHistory$(transactionData)
      })
    )
  }

  /**
   * Updates the value of the pockets according to the received transactions
   * @param {*} walletTransactionExecuted 
   * @param {*} business Business info
   */
  static applyTransactionsOnWallet$(walletTransactionExecuted, business){
    return of(walletTransactionExecuted)
    .pipe(
      //Processes each transaction one by one
      mergeMap(event => from(event.data.transactions)),
      reduce((acc, transaction) => {
        if(transaction.pocket.toUpperCase() == 'BALANCE'){
          acc.balance += transaction.pocket.value;
        }else if(transaction.pocket.toUpperCase() == 'BONUS'){
          acc.bonus += transaction.pocket.value;
        }else{
          throw new Error(`Invalid pocket: ${transaction.pocket}`);
        }
        return acc;
      }, {balance: 0, bonus: 0}),
      mergeMap(increment => WalletDA.updateWalletPockets$(business, increment))
    )
  }

  static checkAlarms$(walletTransactionExecuted){
    return of(walletTransactionExecuted)
  }


}

/**
 * Wallet helpers
 * @returns {WalletHelper}
 */
module.exports = WalletHelper;
