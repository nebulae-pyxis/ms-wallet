import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import * as Rx from 'rxjs';
import { GatewayService } from '../../../api/gateway.service';
import {
  getHelloWorld,
  getSpendingRule,
  getSpendingRules,
  walletHelloWorldSubscription,
  updateSpendingRule
} from './gql/wallet-spending-rules';

@Injectable()
export class WalletSpendingRuleService {


  constructor(private gateway: GatewayService) {

  }

  /**
   * Hello World sample, please remove
   */
  getHelloWorld$() {
    return this.gateway.apollo
      .watchQuery<any>({
        query: getHelloWorld,
        fetchPolicy: 'network-only'
      })
      .valueChanges.map(
        resp => resp.data.getHelloWorldFromwallet.sn
      );
  }

  /**
  * Hello World subscription sample, please remove
  */
 getEventSourcingMonitorHelloWorldSubscription$(): Observable<any> {
  return this.gateway.apollo
    .subscribe({
      query: walletHelloWorldSubscription
    })
    .map(resp => resp.data.walletHelloWorldSubscription.sn);
}
/**
 * Fetch the business unit spending rule.
 * @param businessId Business id
 */
getSpendinRule$(businessId: string){
  return this.gateway.apollo
      .watchQuery<any>({
        query: getSpendingRule,
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
        variables: {
          businessId: businessId
        }
      })
      .valueChanges.map(
        resp => resp.data.WalletGetSpendingRule
      );
}

/*
page: Int!, $count: Int!, $filter: String, $sortColumn: String, $sortOrder: String
*/

/**
 * Fetch the business unit spending rule.
 * @param businessId Business id
 */
getSpendinRules$(page: number, count: number, filter: string, sortColumn: string, sortOrder: string){
  return this.gateway.apollo
      .watchQuery<any>({
        query: getSpendingRules,
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
        variables: {
          page: page,
          count: count,
          filter: filter,
          sortColumn: sortColumn,
          sortOrder: sortOrder
        }
      })
      .valueChanges.map(r => { console.log(r.data); return r; });
}

updateSpendingRule$(spendingRuleInput: any){
  return this.gateway.apollo
  .mutate<any>({
    mutation: updateSpendingRule,
    variables: {
      input: spendingRuleInput
    },
    errorPolicy: 'all'
  });
}




}
