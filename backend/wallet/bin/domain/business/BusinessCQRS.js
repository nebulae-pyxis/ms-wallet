const Rx = require("rxjs");
const broker = require("../../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "emi-materialized-view-updates";
const BusinessHelper = require("./BusinessHelper");
const BusinessDA = require("../../data/BusinessDA");
const RoleValidator = require("../../tools/RoleValidator");
const { CustomError, DefaultError } = require("../../tools/customError");
const {
  PERMISSION_DENIED_ERROR,
  INTERNAL_SERVER_ERROR
} = require("../../tools/ErrorCodes");

let instance;

class BusinessCQRS {
  constructor() {}

  /**
   * Gets the business where the user that is performing the request belong
   *
   * @param {*} args args
   * @param {*} args.businessId business ID
   */
  getWalletBusiness$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "wallet",
      "getWalletBusiness$",
      PERMISSION_DENIED_ERROR,
      ["SYSADMIN", "business-owner"]
      ).mergeMap(roles => {
        const isSysAdmin = roles.SYSADMIN;
        //If a user does not have the role to get info from other business, we must return an error
          if (!isSysAdmin && authToken.businessId != args.businessId) {
            return this.createCustomError$(
              PERMISSION_DENIED_ERROR,
              method
            );
          }
          return Rx.Observable.of(roles);
        })
      .mergeMap(roles => BusinessDA.getBusiness$(args.businessId))
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => {
        return this.handleError$(err);
      });
  }

  /**
   * Gets the businesses registered on the platform
   *
   * @param {*} args args that contain the business filters
   */
  getWalletBusinesses$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "wallet",
      "getWalletBusinesses$()",
      PERMISSION_DENIED_ERROR,
      ["SYSADMIN", "business-owner"]
    )
      .mergeMap(val => BusinessDA.getAllBusinesses$())
      .toArray()
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => {
        return this.handleError$(err);
      });
  }

  //#region  mappers for API responses
  handleError$(err) {
    console.log("Handle error => ", err);
    return Rx.Observable.of(err).map(err => {
      const exception = { data: null, result: {} };
      const isCustomError = err instanceof CustomError;
      if (!isCustomError) {
        err = new DefaultError(err);
      }
      exception.result = {
        code: err.code,
        error: { ...err.getContent() }
      };
      return exception;
    });
  }

  buildSuccessResponse$(rawRespponse) {
    console.log("buildSuccessResponse en business");
    return Rx.Observable.of(rawRespponse).map(resp => {
      return {
        data: resp,
        result: {
          code: 200
        }
      };
    });
  }
}

/**
 * Business CQRS
 * @returns {BusinessCQRS}
 */
module.exports = () => {
  if (!instance) {
    instance = new BusinessCQRS();
    console.log("BusinessCQRS Singleton created");
  }
  return instance;
};
