"use strict";

const helloWorld = require("../../domain/HelloWorld")();
const broker = require("../../tools/broker/BrokerFactory")();
const Rx = require("rxjs");
const jsonwebtoken = require("jsonwebtoken");
const { map, mergeMap, catchError, tap } = require('rxjs/operators');
const jwtPublicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, "\n");
const spendingRules = require('../../domain/spending-rules');
const business = require("../../domain/business/");
const wallet = require("../../domain/wallet/");


let instance;

class GraphQlService {


  constructor() {
    this.functionMap = this.generateFunctionMap();
    this.subscriptions = [];
  }

  /**
   * Starts GraphQL actions listener
   */
  start$() {
      //default on error handler
      const onErrorHandler = (error) => {
        console.error("Error handling  GraphQl incoming event", error);
        process.exit(1);
      };
  
      //default onComplete handler
      const onCompleteHandler = () => {
        () => console.log("GraphQlService incoming event subscription completed");
      };
    return Rx.from(this.getSubscriptionDescriptors()).pipe(
      map(aggregateEvent => ({ ...aggregateEvent, onErrorHandler, onCompleteHandler }))
      ,map(params => this.subscribeEventHandler(params))
    )
  }

  /**
   * build a Broker listener to handle GraphQL requests procesor
   * @param {*} descriptor 
   */
  subscribeEventHandler({
    aggregateType,
    messageType,
    onErrorHandler,
    onCompleteHandler
  }) {
    const handler = this.functionMap[messageType];
    const subscription = broker
      .getMessageListener$([aggregateType], [messageType]).pipe(
        mergeMap(message => this.verifyRequest$(message))
        ,mergeMap(request => ( request.failedValidations.length > 0)
          ? Rx.of(request.errorResponse)
          : Rx.of(request).pipe(
              //ROUTE MESSAGE TO RESOLVER
              mergeMap(({ authToken, message }) =>
              handler.fn
                .call(handler.obj, message.data, authToken).pipe(
                  map(response => ({ response, correlationId: message.id, replyTo: message.attributes.replyTo }))
                )
            )
          )
        )    
        ,mergeMap(msg => this.sendResponseBack$(msg))
      )
      .subscribe(
        msg => { /* console.log(`GraphQlService: ${messageType} process: ${msg}`); */ },
        onErrorHandler,
        onCompleteHandler
      );
    this.subscriptions.push({
      aggregateType,
      messageType,
      handlerName: handler.fn.name,
      subscription
    });
    return {
      aggregateType,
      messageType,
      handlerName: `${handler.obj.name}.${handler.fn.name}`
    };
  }

    /**
   * Verify the message if the request is valid.
   * @param {any} request request message
   * @returns { Rx.Observable< []{request: any, failedValidations: [] }>}  Observable object that containg the original request and the failed validations
   */
  verifyRequest$(request) {
    return Rx.of(request).pipe(
      //decode and verify the jwt token
      mergeMap(message =>
        Rx.of(message).pipe(
          map(message => ({ authToken: jsonwebtoken.verify(message.data.jwt, jwtPublicKey), message, failedValidations: [] }))
          ,catchError(err =>
            EventSourcingMonitor.errorHandler$(err).pipe(
              map(response => ({
                errorResponse: { response, correlationId: message.id, replyTo: message.attributes.replyTo },
                failedValidations: ['JWT']
              }
              ))
            )
          )
        )
      )
    )
  }

 /**
  * 
  * @param {any} msg Object with data necessary  to send response
  */
 sendResponseBack$(msg) {
   return Rx.of(msg).pipe(mergeMap(
    ({ response, correlationId, replyTo }) =>
      replyTo
        ? broker.send$(replyTo, "emi-gateway.graphql.Query.response", response, {
            correlationId
          })
        : Rx.of(undefined)
  ));
}

  stop$() {
    Rx.from(this.subscriptions).pipe(
      map(subscription => {
        subscription.subscription.unsubscribe();
        return `Unsubscribed: aggregateType=${aggregateType}, eventType=${eventType}, handlerName=${handlerName}`;
      })
    );
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  /////////////////// CONFIG SECTION, ASSOC EVENTS AND PROCESSORS BELOW  /////////////////
  ////////////////////////////////////////////////////////////////////////////////////////


  /**
   * returns an array of broker subscriptions for listening to GraphQL requests
   */
  getSubscriptionDescriptors() {
    console.log("GraphQl Service starting ...");
    return [
      {
        aggregateType: "Business",
        messageType: "emigateway.graphql.query.getWalletBusiness"
      },
      {
        aggregateType: "Business",
        messageType: "emigateway.graphql.query.getWalletBusinesses"
      },
      {
        aggregateType: "Wallet",
        messageType: "emigateway.graphql.query.getWallet"
      },
      {
        aggregateType: "Wallet",
        messageType: "emigateway.graphql.mutation.makeManualBalanceAdjustment"
      },
      {
        aggregateType: "Wallet",
        messageType: "emi-gateway.graphql.query.getSpendingRule"
      },
      {
        aggregateType: "Wallet",
        messageType: "emi-gateway.graphql.query.getSpendingRules"
      } 
    ];
  }


  /**
   * returns a map that assocs GraphQL request with its processor
   */
  generateFunctionMap() {    
    return {
      "emigateway.graphql.query.getWalletBusiness": {
        fn: business.cqrs.getWalletBusiness$,
        obj: business.cqrs
      },
      "emigateway.graphql.query.getWalletBusinesses": {
        fn: business.cqrs.getWalletBusinesses$,
        obj: business.cqrs
      },
      "emigateway.graphql.query.getWallet": {
        fn: wallet.cqrs.getWallet$,
        obj: wallet.cqrs
      },
      "emigateway.graphql.mutation.makeManualBalanceAdjustment": {
        fn: wallet.cqrs.makeManualBalanceAdjustment$,
        obj: wallet.cqrs
      },
      "emi-gateway.graphql.query.getSpendingRule": {
        fn: spendingRules.cqrs.getSpendingRule$,
        obj: spendingRules.cqrs
      },
      "emi-gateway.graphql.query.getSpendingRules": {
        fn: spendingRules.cqrs.getSpendingRules$,
        obj: spendingRules.cqrs
      },
    };
  }
}

/**
 * @returns {GraphQlService}
 */
module.exports = () => {
  if (!instance) {
    instance = new GraphQlService();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
