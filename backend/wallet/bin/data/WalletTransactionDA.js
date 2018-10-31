"use strict";

let mongoDB = undefined;
const { take, mergeMap, tap, catchError, map, filter, defaultIfEmpty, first} = require('rxjs/operators'); 
const  { forkJoin, of, interval, from, throwError, defer, Observable } = require('rxjs');
const CollectionName = "TransactionsHistory";
const { CustomError } = require("../tools/customError");

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
   * Creates a new transaction
   * @param {*} transactionData transaction to create
   */
  static saveTransactionHistory$(transactionData) {
    const collection = mongoDB.db.collection(CollectionName);    
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
