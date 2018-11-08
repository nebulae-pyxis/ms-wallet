import { Injectable } from "@angular/core";
import { Observable, BehaviorSubject } from "rxjs";
import {
  startWith
} from "rxjs/operators";
import { GatewayService } from "../../../../api/gateway.service";
import {
  getWalletTransactionsHistory
} from "../gql/wallet";

@Injectable()
export class TransactionHistoryService {

  private selectedBusinessSubject$ = new BehaviorSubject(null);

  private _filterAndPaginator$ = new BehaviorSubject(null);

  private transactionsHistoryFilter = {
    initDate: undefined,
    endDate: undefined,
    transactionType: undefined,
    transactionConcept: undefined,
    terminal: {
      id: undefined,
      userId: undefined,
      username: undefined
    }
  };

  private paginationData = {
    page: 0,
    count: 10,
    sort: 1
  };

  constructor(private gateway: GatewayService) {}

  addFilterAndPaginatorData(filterAndPaginator) {
    this._filterAndPaginator$.next(filterAndPaginator);
  }

  /**
   * 
   */
  get filterAndPaginator$() {
    return this._filterAndPaginator$.asObservable()
    // .pipe(
    //   startWith({
    //     filter: {
    //       initDate: new Date(),
    //       endDate: new Date(),
    //       transactionType: undefined,
    //       transactionConcept: undefined,
    //       terminal: {
    //         id: undefined,
    //         userId: undefined,
    //         username: undefined
    //       }
    //     },
    //     pagination: {
    //       page: 0,
    //       count: 10,
    //       sort: 1
    //     }
    //   })
    // );
  }

  /**
   * Returns an observable
   */
  get selectedBusinessEvent$() {
    return this.selectedBusinessSubject$.asObservable();
  }

  /**
   * Set the selected business
   */
  selectBusiness(business) {
    this.selectedBusinessSubject$.next(business);
  }

  /**
   * Gets the transactions history according to the filter data and pagination.
   *    
   * @param filterInput 
   * @param paginationInput 
   * @returns {Observable}
   */
  getTransactionsHistory$(filterInput, paginationInput) {
    return this.gateway.apollo.query<any>({
      query: getWalletTransactionsHistory,
      variables: {
        filterInput: filterInput,
        paginationInput: paginationInput
      },
      fetchPolicy: "network-only",
      errorPolicy: "all"
    });
  }
  
}
