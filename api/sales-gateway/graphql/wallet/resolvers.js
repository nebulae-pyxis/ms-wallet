const withFilter = require("graphql-subscriptions").withFilter;
const RoleValidator  = require("../../tools/RoleValidator");
const { CustomError } = require("../../tools/customError");
const PubSub = require("graphql-subscriptions").PubSub;
const pubsub = new PubSub();
const Rx = require("rxjs");
const broker = require("../../broker/BrokerFactory")();
const contextName = "User-Management";

//Every single error code
// please use the prefix assigned to this microservice
const INTERNAL_SERVER_ERROR_CODE = 16001;
const USERS_PERMISSION_DENIED_ERROR_CODE = 16002;

function getResponseFromBackEnd$(response) {  
  return Rx.Observable.of(response).map(resp => {
    if (resp.result.code != 200) {      
      const err = new Error();
      err.name = "Error";
      err.message = resp.result.error;
      Error.captureStackTrace(err, "Error");
      throw err;
    }
    return resp.data;
  });
}

/**
 * Handles errors
 * @param {*} err
 * @param {*} operationName
 */
function handleError$(err, methodName) {
  return Rx.Observable.of(err).map(err => {
    const exception = { data: null, result: {} };
    const isCustomError = err instanceof CustomError;
    if (!isCustomError) {
      err = new CustomError(
        err.name,
        methodName,
        INTERNAL_SERVER_ERROR_CODE,
        err.message
      );
    }
    exception.result = {
      code: err.code,
      error: { ...err.getContent() }
    };
    return exception;
  });
}

module.exports = {
  //// QUERY ///////
  Query: {
    getToken(root, args, context){
      return Rx.Observable.of({})
      .mergeMap(response => {
        return broker.forwardAndGetReply$(
          "Token",
          "salesgateway.graphql.query.getToken",
          { root, args, jwt: context.encodedToken },
          2000
        );
      })
      .catch(err => handleError$(err, "getToken"))
      .mergeMap(response => getResponseFromBackEnd$(response))
      .toPromise();
    }
    
  },

  //// MUTATIONS ///////
  Mutation: {
  },

  //// SUBSCRIPTIONS ///////
  Subscription: {
  }
};

//// SUBSCRIPTIONS SOURCES ////

const eventDescriptors = [
];

/**
 * Connects every backend event to the right GQL subscription
 */
eventDescriptors.forEach(descriptor => {
  broker.getMaterializedViewsUpdates$([descriptor.backendEventName]).subscribe(
    evt => {
      if (descriptor.onEvent) {
        descriptor.onEvent(evt, descriptor);
      }
      const payload = {};
      payload[descriptor.gqlSubscriptionName] = descriptor.dataExtractor
        ? descriptor.dataExtractor(evt)
        : evt.data;
      pubsub.publish(descriptor.gqlSubscriptionName, payload);
    },

    error => {
      if (descriptor.onError) {
        descriptor.onError(error, descriptor);
      }
      console.error(`Error listening ${descriptor.gqlSubscriptionName}`, error);
    },

    () => console.log(`${descriptor.gqlSubscriptionName} listener STOPPED`)
  );
});
