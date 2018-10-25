const Rx = require("rxjs");
const broker = require("../../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "emi-materialized-view-updates";
const uuidv4 = require("uuid/v4");
const RoleValidator = require("../../tools/RoleValidator");
const { CustomError, DefaultError } = require("../../tools/customError");
const {
  PERMISSION_DENIED_ERROR,
  INTERNAL_SERVER_ERROR
} = require("../../tools/ErrorCodes");

let instance;

class WalletCQRS {
  constructor() {}

  /**
   * Gets the wallet info of a business
   *
   * @param {*} args args
   */
  getWallet$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      context,
      method,
      PERMISSION_DENIED_ERROR_CODE,
      ["SYSADMIN", "business-owner"]
    ).mergeMap(roles => {
      const isSysAdmin = roles.SYSADMIN;
      //If a user does not have the role to get info of a wallet from other business, we must return an error
        if (!isSysAdmin && authToken.businessId != args.businessId) {
          return this.createCustomError$(
            PERMISSION_DENIED_ERROR,
            method
          );
        }
        return Rx.Observable.of(roles);
      })
      .mergeMap(val => BusinessDA.getBusiness$(args.businessId))
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => {
        return this.handleError$(err);
      });
  }

  /**
   * Makes manual balance adjustment
   *
   * @param {*} data args that contain the ifno of the manual balance adjustment
   * @param {string} authToken JWT token
   */
  makeManualBalanceAdjustment$(data, authToken) {
    const manualBalanceAdjustment = !data.args ? undefined : data.args.input;
    manualBalanceAdjustment._id = uuidv4();
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      context,
      method,
      PERMISSION_DENIED_ERROR,
      ["SYSADMIN"]
    )
      .mergeMap(roles => {              
        return eventSourcing.eventStore.emitEvent$(
          new Event({
            eventType: manualBalanceAdjustment.adjustmentType == 'DEBIT' ? "WalletSpendingCommited": "WalletDepositCommited",
            eventTypeVersion: 1,
            aggregateType: "Wallet",
            aggregateId: manualBalanceAdjustment._id,
            data: manualBalanceAdjustment,
            user: authToken.preferred_username
          })
        );
      })
      .map(result => {
        return {
          code: 200,
          message: `Manual balance adjustment with id: ${manualBalanceAdjustment._id} has been created`
        };
      })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => this.handleError$(err));
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
 * Wallet CQRS
 * @returns {WalletCQRS}
 */
module.exports = () => {
  if (!instance) {
    instance = new WalletCQRS();
    console.log("WalletCQRS Singleton created");
  }
  return instance;
};
