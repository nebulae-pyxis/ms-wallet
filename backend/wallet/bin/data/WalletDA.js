"use strict";
let mongoDB = undefined;
const COLLECTION_NAME = "Wallet";
const { CustomError } = require("../tools/customError");
const { take, mergeMap, catchError, map, tap } = require('rxjs/operators');
const  { Observable, forkJoin, of, interval, defer } = require('rxjs');

class WalletDA {
  static start$(mongoDbInstance) {
    return Observable.create(observer => {
      if (mongoDbInstance) {
        mongoDB = mongoDbInstance;
        observer.next("using given mongo instance ");
      } else {
        mongoDB = require("./MongoDB").singleton();
        observer.next("using singleton system-wide mongo instance");
      }
      observer.complete();
    });
  }

  /**
   * get the wallet info by business ID
   * @param {string} businessId Business unit related
   */
  static getWallet$(businessId) {
    const collection = mongoDB.db.collection(COLLECTION_NAME);
    return of(businessId).pipe(
      mergeMap(id => defer(() => collection.findOne({ businessId: id })))
    );
  }

  /**
   * Persists the wallet info . If the wallet has been already created and error will be generated.
   * @param {*} wallet 
   */
  static createWallet$(wallet) {
    const collection = mongoDB.db.collection(COLLECTION_NAME);
    return of(wallet)
    .pipe(
      mergeMap(wallet => defer(() => {
        const walletData = {
          businessId: wallet.businessId,
          businessName: wallet.businessName,
          spendingState: wallet.spendingState,
          pockets: {
            balance: wallet.pockets.balance,
            bonus: wallet.pockets.bonus
          }
        };
        return collection.insertOne(walletData);
      }))
    );
  }

  /**
   * updates the wallet business name.
   * @param {*} businessId ID of the business associated to the wallet
   * @param {*} newBusinessName new business name
   */
  static updateWalletBusinessName$(businessId, newBusinessName) {
    const collection = mongoDB.db.collection(COLLECTION_NAME);
    return of({businessId, newBusinessName})
    .pipe(
      mergeMap(business => defer(() => {
        const updateQuery = {
          $set: {businessName: newBusinessName}
        };
        return collection.updateOne({ businessId }, updateQuery);
      }))
    );
  }

  /**
   * update the wallet pocket values. If the wallet is not found, a new wallet will be created.
   * 
   * @param {string} business Business data
   * @param {Object} increment Indicates the increments that must be performed on the different pockets
   * @param {Object} increment.balance value to be incremented in the balance pocket
   * @param {Object} increment.bonus value to be incremented in the bonus pocket
   */
  static updateWalletPockets$(business, increment) {
    console.log('updateWalletPockets => ', business, increment);
    const collection = mongoDB.db.collection(COLLECTION_NAME);
    return of(business)
    .pipe(
      mergeMap(business => defer(() => {
        const updateQuery = {
          $inc: {
            'pockets.balance': increment.balance,
            'pockets.bonus': increment.bonus
          },
          $setOnInsert: {
            businessId: business._id,
            businessName: business.name,
            spendingState: 'FORBIDDEN'
          }
        };
        return collection.updateOne({ businessId: business._id }, updateQuery, {upsert: true});
      }))
    );
  }

  /**
   * Updates the spending state of the indicated business and returns the updated wallet.
   * @param {*} businessId ID of the business to update
   * @param {*} newSpendingState new spending state (ALLOWED, FORBIDDEN)
   */
  static updateWalletSpendingState$(businessId, newSpendingState) {
    console.log("updateWalletSpendingState$ ==> ", businessId, newSpendingState);
    const collection = mongoDB.db.collection(COLLECTION_NAME);
    return of({businessId, newSpendingState})
    .pipe(
      mergeMap(({businessId, newSpendingState}) => defer(() => {
        const updateQuery = {
          $set: {
            'spendingState': newSpendingState
          }
        };
        return collection.findOneAndUpdate({ businessId }, updateQuery, {returnOriginal: false});
      }))
    );
  }
}

/**
 * Returns a WalletTransactionDA
 * @returns {WalletDA}
 */
module.exports = WalletDA;
