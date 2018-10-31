"use strict";

let mongoDB = undefined;
const Rx = require("rxjs");
const COLLECTION_NAME = "Wallet";
const { CustomError } = require("../tools/customError");

class WalletDA {
  static start$(mongoDbInstance) {
    return Rx.Observable.create(observer => {
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
   * update the wallet pocket values. If the wallet is not found, a new wallet will be created.
   * 
   * @param {string} business Business data
   * @param {Object} increment Indicates the increments that must be performed on the different pockets
   * @param {Object} increment.balance value to be incremented in the balance pocket
   * @param {Object} increment.bonus value to be incremented in the bonus pocket
   */
  static updateWalletPockets$(business, increment) {
    const collection = mongoDB.db.collection(COLLECTION_NAME);
    return of(business)
    .pipe(
      mergeMap(business => defer(() => {
        const updateQuery = {
          $inc: {
            'pocket.balance': increment.balance,
            'pocket.bonus': increment.bonus
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
}

/**
 * Returns a WalletTransactionDA
 * @returns {WalletDA}
 */
module.exports = WalletDA;
