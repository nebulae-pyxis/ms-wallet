import { WalletService } from '../wallet-spending-rules.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { fuseAnimations } from '../../../../core/animations';
import { Subscription } from 'rxjs/Subscription';
// tslint:disable-next-line:import-blacklist
import * as Rx from 'rxjs/Rx';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'spending-rule',
  templateUrl: './spending-rule.component.html',
  styleUrls: ['./spending-rule.component.scss'],
  animations: fuseAnimations
})
export class SpendingRuleComponent implements OnInit, OnDestroy {

  helloWorld: String = 'Hello World static';
  helloWorldLabelQuery$: Rx.Observable<any>;
  helloWorldLabelSubscription$: Rx.Observable<any>;

  constructor(private walletervice: WalletService  ) {

  }


  ngOnInit() {
    this.helloWorldLabelQuery$ = this.walletervice.getHelloWorld$();
    this.helloWorldLabelSubscription$ = this.walletervice.getEventSourcingMonitorHelloWorldSubscription$();
  }


  ngOnDestroy() {
  }

}
