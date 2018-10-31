"use strict";

let mongoDB = undefined;
const Rx = require("rxjs");
const COLLECTION_NAME = "Wallet";
const { CustomError } = require("../tools/customError");

class WalletDA {

  static start$(mongoDbInstance) {
    return Rx.Observable.create((observer) => {
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
     * get the wallet info by business ID
     * @param {string} businessId Business unit related
     */
    static getWallet$(businessId) {
        const collection = mongoDB.db.collection(COLLECTION_NAME);
        return of(businessId)
            .pipe(
                mergeMap(id => defer(() => collection.findOne(
                    { businessId: id }
                )))
            )
    }

    

 
}

/**
 * Returns a WalletTransactionDA
 * @returns {WalletDA}
 */
module.exports = WalletDA;
