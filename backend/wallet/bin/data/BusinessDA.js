"use strict";

let mongoDB = undefined;
const Rx = require("rxjs");
const CollectionName = "Business";
const { CustomError } = require("../tools/customError");
const { defer, of } = require('rxjs');
const { map, mergeMap } = require('rxjs/operators');

class BusinessDA {

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
   * Creates a new business
   * @param {*} business business to create
   */
  static persistBusiness$(business) {
    console.log("# BUSINES CREATED ==>", business);
    const collection = mongoDB.db.collection(CollectionName);   
    return of(business)
    .pipe(
      map(bu => ({ _id: bu._id, name: bu.generalInfo.name })),
      mergeMap(bu => defer(() => collection.insertOne(bu)))      
    )
  }

  /**
   * modifies the general info of the indicated business 
   * @param {*} id  Business ID
   * @param {*} businessGeneralInfo  New general information of the business
   */
  static updateBusinessGeneralInfo$(id, businessGeneralInfo) {
    const collection = mongoDB.db.collection(CollectionName);
    console.log("####", id, businessGeneralInfo);
    return Rx.defer(() =>
      collection.findOneAndUpdate(
        { _id: id },
        {
          $set: { name: businessGeneralInfo.name }
        }, {
          returnOriginal: false
        }
      )
    )
      .pipe(
        map(result => result && result.value ? result.value : undefined)
      )
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
 * Returns a BusinessDA
 * @returns {BusinessDA}
 */
module.exports = BusinessDA;
