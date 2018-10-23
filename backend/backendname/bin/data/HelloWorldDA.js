'use strict'

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const Rx = require('rxjs');
const CollectionName = "CollectionName";//please change
const { CustomError } = require('../tools/customError');
const { map } = require('rxjs/operators');


class HelloWorldDA {

  static start$(mongoDbInstance) {
    return Rx.Observable.create((observer) => {
      if (mongoDbInstance) {
        mongoDB = mongoDbInstance;
        observer.next('using given mongo instance');
      } else {
        mongoDB = require('./MongoDB').singleton();
        observer.next('using singleton system-wide mongo instance');
      }
      observer.complete();
    });
  }
  
  /**
   * get hello world data
   * @param {string} type
   */
  static getHelloWorld$(evt) {    
    return Rx.of(`{sn: Hello World ${Date.now()}}`).pipe(
      map(val => {
        const result = {};
        result['sn'] = val;
        return result;
      })
    );
  }
}
/**
 * @returns {HelloWorldDA}
 */
module.exports =  HelloWorldDA 