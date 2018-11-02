'use strict'

const Rx = require('rxjs');
const MongoClient = require('mongodb').MongoClient;
const CollectionName = "Business";
let instance = null;
const { map } = require('rxjs/operators');

class MongoDB {

    /**
     * initialize and configure Mongo DB
     * @param { { url, dbName } } ops 
     */
    constructor({ url, dbName }) {
        this.url = url;
        this.dbName = dbName;
    }

    /**
     * Starts DB connections
     * @returns {Rx.Observable} Obserable that resolve to the DB client
     */
    start$() {
        console.log("MongoDB.start$()... ");
        return Rx.bindNodeCallback(MongoClient.connect)(this.url).pipe(
            map(client => {
                console.log(this.url);
                this.client = client;
                this.db = this.client.db(this.dbName);
                return `MongoDB connected to dbName= ${this.dbName}`;
            })
        );
    }

    /**
   * Stops DB connections
   * Returns an Obserable that resolve to a string log
   */
    stop$() {
        return Rx.Observable.create((observer) => {
            this.client.close();
            observer.next('Mongo DB Client closed');
            observer.complete();
        });
    }

    /**
     * Ensure Index creation
     * Returns an Obserable that resolve to a string log
     */
    createIndexes$() {
        return Rx.Observable.create(async (observer) => {
            observer.next('Creating index for wallet.Wallet => ({ businessId: 1}, { unique: true })  ');
            await this.db.collection('Wallet').createIndex( { businessId: 1}, { unique: true });  

            observer.next('All indexes created');
            observer.complete();
        });
    }

    /**
   * Drop current DB
   */
  dropDB$() {
    return Rx.Observable.create(async observer => {
      await this.db.dropDatabase();
      observer.next(`Database ${this.dbName} dropped`);
      observer.complete();
    });
  }

}

module.exports = {
    MongoDB,
    singleton() {
        if (!instance) {
            instance = new MongoDB(
                {
                    url: process.env.MONGODB_URL,
                    dbName: process.env.MONGODB_DB_NAME,
                }
            );
            console.log(`MongoDB instance created: ${process.env.MONGODB_DB_NAME}`);
        }
        return instance;
    }
};