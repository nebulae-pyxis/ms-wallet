const withFilter = require("graphql-subscriptions").withFilter;
const PubSub = require("graphql-subscriptions").PubSub;
const pubsub = new PubSub();
const Rx = require("rxjs");
const broker = require("../../broker/BrokerFactory")();
const CONTEXT_NAME = "WALLET";
const RoleValidator = require('../../tools/RoleValidator');
const PERMISSION_DENIED_ERROR_CODE = 19000;

function getResponseFromBackEnd$(response) {
    return Rx.Observable.of(response)
        .map(resp => {
            if (resp.result.code != 200) {
                const err = new Error();
                err.name = 'Error';
                err.message = resp.result.error;
                // this[Symbol()] = resp.result.error;
                Error.captureStackTrace(err, 'Error');
                throw err;
            }
            return resp.data;
        });
}


module.exports = {
  //// QUERY ///////

  Query: {
      getWalletBusiness(root, args, context) {
            return RoleValidator.checkPermissions$(
              context.authToken.realm_access.roles,
              CONTEXT_NAME,
              "getWalletBusiness",
              PERMISSION_DENIED_ERROR_CODE,
              "Permission denied",
              ["SYSADMIN"]
            )
              .mergeMap(response => {
                return broker.forwardAndGetReply$(
                  "Business",
                  "emigateway.graphql.query.getWalletBusiness",
                  { root, args, jwt: context.encodedToken },
                  2000
                );
              })
              .catch(err => handleError$(err, "getWalletBusiness"))
              .mergeMap(response => getResponseFromBackEnd$(response))
              .toPromise();
        },
        getWalletBusinesses(root, args, context) {
            return RoleValidator.checkPermissions$(
              context.authToken.realm_access.roles,
              CONTEXT_NAME,
              "getWalletBusinesses",
              PERMISSION_DENIED_ERROR_CODE,
              "Permission denied",
              ["SYSADMIN"]
            )
              .mergeMap(response => {
                return broker.forwardAndGetReply$(
                  "Business",
                  "emigateway.graphql.query.getWalletBusinesses",
                  { root, args, jwt: context.encodedToken },
                  2000
                );
              })
              .catch(err => handleError$(err, "getWalletBusinesses"))
              .mergeMap(response => getResponseFromBackEnd$(response))
              .toPromise();
        },
    WalletGetSpendingRule(root, args, context) {
      return RoleValidator.checkPermissions$(
        context.authToken.realm_access.roles,
        CONTEXT_NAME,
        "getWalletSpendingRule",
        PERMISSION_DENIED_ERROR_CODE,
        "Permission denied",
        ["SYSADMIN"]
      )
        .mergeMap(response => broker
          .forwardAndGetReply$(
            "SpendingRule",
            "emigateway.graphql.query.getSpendingRule",
            { root, args, jwt: context.encodedToken },
            2000
          )
        )
        .catch(err => handleError$(err, "getWalletSpendingRule"))
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
    },
    WalletGetSpendingRules(root, args, context) {      
        return broker
          .forwardAndGetReply$(
            "SpendingRule",
            "emigateway.graphql.query.getSpendingRules",
            { root, args, jwt: context.encodedToken },
            2000
          )
          .mergeMap(response => getResponseFromBackEnd$(response))
          .toPromise();
      },
  },

  //// MUTATIONS ///////
  Mutation: {
    makeManualBalanceAdjustment(root, args, context) {
      return RoleValidator.checkPermissions$(
        context.authToken.realm_access.roles,
        CONTEXT_NAME,
        "makeManualBalanceAdjustment",
        PERMISSION_DENIED_ERROR_CODE,
        "Permission denied",
        ["SYSADMIN"]
      )
        .mergeMap(roles => {
          return context.broker.forwardAndGetReply$(
            "ManualBalanceAdjustment",
            "emigateway.graphql.mutation.makeManualBalanceAdjustment",
            { root, args, jwt: context.encodedToken },
            2000
          );
        })
        .catch(err => handleError$(err, "makeManualBalanceAdjustment"))
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
    },
    walletUpdateSpendingRule(root, args, context) {
      console.log("LLEGA LA MUTACION");

      return broker.forwardAndGetReply$(
        "SpendingRule",
        "emigateway.graphql.mutation.updateSpendingRule",
        { root, args, jwt: context.encodedToken },
        2000
      )
        .catch(err => handleError$(err, "updateSpendingRule"))
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
    },
  },

  //// SUBSCRIPTIONS ///////
  Subscription: {
    walletHelloWorldSubscription: {
      subscribe: withFilter(
        (payload, variables, context, info) => {
          return pubsub.asyncIterator("walletHelloWorldSubscription");
        },
        (payload, variables, context, info) => {
          return true;
        }
      )
    }
  }
};



//// SUBSCRIPTIONS SOURCES ////

const eventDescriptors = [
    {
        backendEventName: 'walletHelloWorldEvent',
        gqlSubscriptionName: 'walletHelloWorldSubscription',
        dataExtractor: (evt) => evt.data,// OPTIONAL, only use if needed
        onError: (error, descriptor) => console.log(`Error processing ${descriptor.backendEventName}`),// OPTIONAL, only use if needed
        onEvent: (evt, descriptor) => {} // console.log(`Event of type  ${descriptor.backendEventName} arraived`),// OPTIONAL, only use if needed
    },
];


/**
 * Connects every backend event to the right GQL subscription
 */
eventDescriptors.forEach(descriptor => {
    broker
        .getMaterializedViewsUpdates$([descriptor.backendEventName])
        .subscribe(
            evt => {
                if (descriptor.onEvent) {
                    descriptor.onEvent(evt, descriptor);
                }
                const payload = {};
                payload[descriptor.gqlSubscriptionName] = descriptor.dataExtractor ? descriptor.dataExtractor(evt) : evt.data
                pubsub.publish(descriptor.gqlSubscriptionName, payload);
            },

            error => {
                if (descriptor.onError) {
                    descriptor.onError(error, descriptor);
                }
                console.error(
                    `Error listening ${descriptor.gqlSubscriptionName}`,
                    error
                );
            },

            () =>
                console.log(
                    `${descriptor.gqlSubscriptionName} listener STOPED`
                )
        );
});


