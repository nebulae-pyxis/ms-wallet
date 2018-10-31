import { Injectable } from "@angular/core";
import { Observable, BehaviorSubject } from "rxjs";
import * as Rx from "rxjs";
import { GatewayService } from "../../../../api/gateway.service";
import { makeManualBalanceAdjustment } from "../gql/wallet";

@Injectable()
export class TransactionHistoryService {

  private selectedBusinessSubject = new BehaviorSubject(null);

  private transactionHistoryPaginator = new BehaviorSubject(null);

  constructor(private gateway: GatewayService) {}

  /**
   * Returns an observable
   */
  get selectedBusinessEvent$() {
    return this.selectedBusinessSubject.asObservable();
  }

  /**
   * Set the selected business
   */
  selectBusiness(business) {
    this.selectedBusinessSubject.next(business);
  }

  /**
   * get the transaction history according to the filter data
   * @returns {Observable}
   * @param pageIndex
   * @param pageSize
   * @param business
   */
  getTransactionHistory$(pageIndex, pageSize, business) {
    return Observable.of();
  }
}
