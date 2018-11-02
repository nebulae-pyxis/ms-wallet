"use strict";

let mongoDB = undefined;
const  { defer, Observable } = require('rxjs');
const COLLECTION_NAME = `TransactionsHistory_`;

class WalletTransactionDA {

  static start$(mongoDbInstance) {
    return Observable.create((observer) => {
      if (mongoDbInstance) {
        mongoDB = mongoDbInstance;
        observer.next('using given mongo instance ');
      } else {
        mongoDB = require('./MongoDB').singleton();
        observer.next('using singleton system-wide mongo instance');
      }
      observer.complete();
    });
  }

  /**
   * Saves the transaction in a Mongo collection. The collection where the transaction 
   * will be stored is determined according to the last four (4) characters of the uuid.
   * since these correspond to the month and year where the info will be persisted.
   * 
   * @param {*} transactionData transaction to create
   */
  static saveTransactionHistory$(transactionData) {
    console.log('saveTransactionHistory => ', transactionData);
    const monthYear = transactionData._id.substr(transactionData._id.length - 4)
    console.log("MES_Y_AÑO ==> ", monthYear);
    const collection = mongoDB.db.collection(`${COLLECTION_NAME}${monthYear}`);    
    return defer(() => collection.insertOne(transactionData));
  }



    /**
   * Extracts the next value from a mongo cursor if available, returns undefined otherwise
   * @param {*} cursor
   */
  static async extractNextFromMongoCursor(cursor) {
    const hasNext = await cursor.hasNext();
    if (hasNext) {
      const obj = await cursor.next();
      return obj;
    }
    return undefined;
  }
}

/**
 * Returns a WalletTransactionDA
 * @returns {WalletTransactionDA}
 */
module.exports = WalletTransactionDA;
