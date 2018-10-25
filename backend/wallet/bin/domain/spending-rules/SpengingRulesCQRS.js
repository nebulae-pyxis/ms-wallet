const Rx = require("rxjs");
const broker = require("../../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
const RoleValidator = require("../../tools/RoleValidator");
const { CustomError, DefaultError } = require("../../tools/customError");
const {
  PERMISSION_DENIED_ERROR
} = require("../../tools/ErrorCodes");
const spendingRulesDA = require('../../data/SpendingRulesDA');
const { take, mergeMap, tap, catchError, map } = require('rxjs/operators');
const  { forkJoin, of, interval, throwError } = require('rxjs');

let instance;

class BusinessCQRS {
  constructor() { }

  getSpendingRule$({ root, args, jwt }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "SpendingRule",
      "getSpendingRule$",
      PERMISSION_DENIED_ERROR,
      ["developer"]
    )
      .pipe(
        mergeMap(() => spendingRulesDA.getSpendingRule$(args.businessId)),
        mergeMap((rawResponse) => this.buildSuccessResponse$(rawResponse)),
        catchError(err => this.errorHandler$(err))
      )
  }

  getSpendingRules$({ root, args, jwt }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "SpendingRule",
      "getSpendingRule$",
      PERMISSION_DENIED_ERROR,
      ["developer"]
    )
      .pipe(
        mergeMap(() => spendingRulesDA.getSpendingRules$(args.page, args.count, args.filter, args.sortColumn, args.sortOrder)),
        mergeMap((rawResponse) => this.buildSuccessResponse$(rawResponse)),
        catchError(err => this.errorHandler$(err))
      )
  }

  //#region  mappers for API responses
  errorHandler$(err) {
    return Rx.of(err).pipe(
      map(err => {
        const exception = { data: null, result: {} };
        const isCustomError = err instanceof CustomError;
        if (!isCustomError) {
          err = new DefaultError(err)
        }
        exception.result = {
          code: err.code,
          error: { ...err.getContent() }
        }
        return exception;
      }
      )
    );
  }

  buildSuccessResponse$(rawRespponse) {
    return Rx.of(rawRespponse)
      .pipe(map(resp => ({
        data: resp,
        result: {
          code: 200
        }
      })
      )
      );
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
