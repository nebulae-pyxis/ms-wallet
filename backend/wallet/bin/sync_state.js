'use strict'

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}

const mongoDB = require('./data/MongoDB').singleton();
const BusinessDA = require('./data/BusinessDA');
const eventSourcing = require('./tools/EventSourcing')();
const eventStoreService = require('./services/event-store/EventStoreService')();
const Rx = require('rxjs');

const start = () => {
    Rx.concat(
        // initializing needed resources
        mongoDB.start$(),
        BusinessDA.start$(),
        eventSourcing.eventStore.start$(),        
        // // executing maintenance tasks
        eventStoreService.syncState$(),

        // stoping resources
        eventSourcing.eventStore.stop$(),
        eventStoreService.stop$(),
        mongoDB.stop$(),
    ).subscribe(
        (evt) => console.log(`wallet (syncing): ${(evt instanceof Object) ? JSON.stringify(evt) : evt}`),
        (error) => {
            console.error('Failed to sync state', error);
            process.exit(1);
        },
        () => {
            console.log('wallet state synced');
            process.exit(0);
        }
    );
}

start();



