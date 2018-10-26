import { Observable } from 'rxjs/Observable';
import { WalletSpendingRuleService } from '../wallet-spending-rules.service';
import { Component, OnDestroy, OnInit, Input } from '@angular/core';
import { fuseAnimations } from '../../../../core/animations';
import { Subscription } from 'rxjs/Subscription';
// tslint:disable-next-line:import-blacklist
import * as Rx from 'rxjs/Rx';
import { FormGroup, FormControl, Validators, FormArray, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, mergeMap, map, tap } from 'rxjs/operators';
import { syntaxError } from '@angular/compiler';

export interface SpendingRule {
  id: string;
  businessId: String;
  businessName: String;
  editedBy: string;
  lastEdition: number;
  minOperationAmount: number;
  autoPocketSelection: any[];
  productUtilitiesConfig: SpendingRule[];
}

export interface ProductConfigRule {
  type: string;
  concept: string;
  percentageByMain: number;
  percentageByCredit: number;
}
export interface AutoPocketRule {
  priority: number;
  toUse: string;
  When: { pocket: string, comparator: string, value: number | null };
}


@Component({
  // tslint:disable-next-line:component-selector
  selector: 'spending-rule',
  templateUrl: './spending-rule.component.html',
  styleUrls: ['./spending-rule.component.scss'],
  animations: fuseAnimations
})
export class SpendingRuleComponent implements OnInit, OnDestroy {
  @Input() currentVersion = true;

  settingsForm: FormGroup = new FormGroup({
    businessId: new FormControl({value: '', disabled: true}, [Validators.required]),
    businessName: new FormControl({value: '', disabled: true}, [Validators.required]),
    minOperationAmount: new FormControl(null, [Validators.required]),
    utilitiesByProduct: new FormArray([], [Validators.required]),
    autoPocketSelectionRules: new FormArray([], [Validators.required])

  });

  constructor(
    private walletSpendingRuleService: WalletSpendingRuleService,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private router: Router  ) {

  }


  ngOnInit() {
    this.route.params
    .pipe(
      filter(params => params['buId']),
      map(params => params['buId']),
      tap(r => console.log('Business Id: ', r)),
      mergeMap(buId => this.walletSpendingRuleService.getSpendinRule$(buId)),
      mergeMap(spendingRule => this.loadSpendingRule$(spendingRule))
    )
    .subscribe(p => console.log('Query params', p), e => console.log(e), () => console.log('Completed'));
  }

  /**
   *
   * @param businesId Business id to search its spending rule
   */
  loadSpendingRule$(spendingRule: SpendingRule): Observable<any>{
    console.log('Spending RUle ==> ', spendingRule);
    this.settingsForm.get('businessName').setValue(spendingRule.businessName);
    this.settingsForm.get('businessId').setValue(spendingRule.businessId);
    this.settingsForm.get('minOperationAmount').setValue(spendingRule.minOperationAmount);



    return Rx.Observable.of(0);
  }

  addProductSetting(productConfig?: ProductConfigRule ): void {
    const items = this.settingsForm.get('utilitiesByProduct') as FormArray;
    items.push(this.createProductSetting( productConfig ));
  }
  addAutoPocketSelectionRule(autoPocketRule?: AutoPocketRule ): void {
    const items = this.settingsForm.get('autoPocketSelectionRules') as FormArray;
    items.push(this.createAutoPocketRule( autoPocketRule ));
  }

  deleteControl(formType: string, index: number){
    const formGroup = this.settingsForm.get(formType) as FormArray;
    formGroup.removeAt(index);
  }

  createAutoPocketRule(pocketRule: AutoPocketRule) {
    if (!pocketRule){
      pocketRule = {
        priority : (this.settingsForm.get('autoPocketSelectionRules') as FormArray).length + 1,
        toUse: 'MAIN',
        When: {
          pocket: 'MAIN',
          comparator: 'ENOUGH',
          value: null
        }
      };
    }
    return this.formBuilder.group({
      priority: new FormControl({ value: pocketRule.priority, disabled: !this.currentVersion }, [Validators.required]),
      toUse: new FormControl({ value: pocketRule.toUse, disabled: !this.currentVersion }, [Validators.required]),
      pocket: new FormControl({ value: pocketRule.When.pocket, disabled: !this.currentVersion }, [Validators.required]),
      comparator: new FormControl({ value: pocketRule.When.comparator, disabled: !this.currentVersion }, [Validators.required]),
      value: new FormControl({ value: pocketRule.When.value, disabled: !this.currentVersion }),
    });
  }

  createProductSetting(productConfig?: ProductConfigRule) {
    if (!productConfig){
      productConfig = {
        type: '',
        concept: '',
        percentageByMain: 0,
        percentageByCredit: 0
      };
    }
    return this.formBuilder.group({
      type: new FormControl( { value: productConfig.type, disabled: !this.currentVersion }, [Validators.required]),
      concept: new FormControl({ value: productConfig.concept, disabled: !this.currentVersion }, [Validators.required]),
      percentageByMain: new FormControl({ value: productConfig.percentageByMain, disabled: !this.currentVersion }, [
          Validators.required,
          Validators.min(0)
        ]
      ),
      percentageByCredit: new FormControl({ value: productConfig.percentageByCredit, disabled: !this.currentVersion }, [
        Validators.required,
        Validators.min(0)
      ]
    )
    });
  }


  validateReloaders(): { [s: string]: boolean } {
    const fareCollector = (this.settingsForm.get('fareCollectors') as FormArray).getRawValue()[0];
    const reloaders = this.settingsForm.get('reloaders') as FormArray;
    const index = reloaders.getRawValue().findIndex(e => (e.percentage + fareCollector.percentage) > 100 );
    return (index !== -1) ? { 'percentageExceeded': true } : null;
  }

  saveSpendingRule(){

  }

  undoChanges(){

  }

  ngOnDestroy() {
  }

}
