import { Injectable } from "@angular/core";
import * as Rx from "rxjs";
import { Observable, BehaviorSubject } from "rxjs";
import { GatewayService } from "../../../api/gateway.service";
import {
  getWalletBusiness,
  getWalletBusinesses,
  getWallet,
  walletHelloWorldSubscription
} from "./gql/wallet";

@Injectable()
export class WalletService {

  constructor(private gateway: GatewayService) {}

  /**
   * get the business which the user belongs
   *
   * @returns {Observable}
   */
  getBusiness$() {
    return this.gateway.apollo.query<any>({
      query: getWalletBusiness,
      fetchPolicy: "network-only",
      errorPolicy: "all"
    });
  }

  /**
   * get all of the businesses
   *
   * @returns {Observable}
   */
  getBusinesses$() {
    return this.gateway.apollo.query<any>({
      query: getWalletBusinesses,
      fetchPolicy: "network-only",
      errorPolicy: "all"
    });
  }

  /**
   * get wallet info of a business
   *   
   * @param business business filter
   * @returns {Observable}
   */
  getWallet$(business) {
    return this.gateway.apollo.query<any>({
      query: getWallet,
      variables: {
        businessId: business._id
      },
      fetchPolicy: "network-only",
      errorPolicy: "all"
    });
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
}
