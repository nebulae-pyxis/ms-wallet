import { Observable } from 'rxjs/Observable';
import { WalletSpendingRuleService } from '../wallet-spending-rules.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { fuseAnimations } from '../../../../core/animations';
import { Subscription } from 'rxjs/Subscription';
// tslint:disable-next-line:import-blacklist
import * as Rx from 'rxjs/Rx';
import { FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, mergeMap, map, tap } from 'rxjs/operators';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'spending-rule',
  templateUrl: './spending-rule.component.html',
  styleUrls: ['./spending-rule.component.scss'],
  animations: fuseAnimations
})
export class SpendingRuleComponent implements OnInit, OnDestroy {

  settingsForm: FormGroup = new FormGroup({
    basicAttributes: new FormGroup({
      buId: new FormControl(null, [Validators.required]),
      buName: new FormControl(null, [Validators.required]),
      minOperationAmount: new FormControl(null, [Validators.required])
    }),
    utilitiesByProduct: new FormArray([], [Validators.required]),
    // autoPocketSelectionRules: new FormArray([], [Validators.required])

  });

  constructor(
    private walletSpendingRuleService: WalletSpendingRuleService,
    private route: ActivatedRoute,
    private router: Router  ) {

  }


  ngOnInit() {
    this.route.params
    .pipe(
      filter(params => params['buId']),
      map(params => params['buId']),
      tap(r => console.log('Business Id: ', r)),
      mergeMap(buId => this.loadSpendingRule$(buId) )
    )
    .subscribe(p => console.log('Query params', p), e => console.log(e), () => console.log('Completed'));
  }

  /**
   *
   * @param businesId Business id to search its spending rule
   */
  loadSpendingRule$(businesId: string): Observable<any>{
    return this.walletSpendingRuleService.getSpendinRule$(businesId);
  }


  ngOnDestroy() {
  }

}
