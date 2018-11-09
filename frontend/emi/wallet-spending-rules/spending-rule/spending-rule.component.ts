import { tap } from 'rxjs/operators';
import { FuseTranslationLoaderService } from './../../../../core/services/translation-loader.service';
import { WalletSpendingRuleService } from '../wallet-spending-rules.service';
import { Component, OnDestroy, OnInit, Input } from '@angular/core';
import { fuseAnimations } from '../../../../core/animations';
import { Subscription } from 'rxjs/Subscription';
// tslint:disable-next-line:import-blacklist
import * as Rx from 'rxjs/Rx';
import { FormGroup, FormControl, Validators, FormArray, FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { filter, mergeMap, map } from 'rxjs/operators';
import { ObservableMedia } from '@angular/flex-layout';
import { from } from 'rxjs';
import { locale as english } from '../i18n/en';
import { locale as spanish } from '../i18n/es';


export interface SpendingRule {
  id: string;
  businessId: String;
  businessName: String;
  editedBy: string;
  lastEditionTimestamp: number;
  minOperationAmount: number;
  autoPocketSelectionRules: AutoPocketRule[];
  productBonusConfigs: ProductConfigRule[];
}

export interface ProductConfigRule {
  type: string;
  concept: string;
  bonusType: String;
  bonusValueByBalance: number;
  bonusValueByCredit: number;
}

export interface AutoPocketRule {
  priority: number;
  pocketToUse: string;
  condition: { pocket: string, comparator: string, value: number | null };
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
  selectedSpendingRule: SpendingRule;
  screenMode = 0;
  alertBorderAtProductBonusConfig: -1;
  alertBorderAtAutopocketSelectionRule: -1;

  settingsForm: FormGroup = new FormGroup({
    businessId: new FormControl('', [Validators.required]),
    businessName: new FormControl('', [Validators.required]),
    // minOperationAmount: new FormControl('', [ Validators.required ]),
    productBonusConfigs: new FormArray([]),
    autoPocketSelectionRules: new FormArray([])
  });

  constructor(
    private walletSpendingRuleService: WalletSpendingRuleService,
    private route: ActivatedRoute,
    private translationLoader: FuseTranslationLoaderService,
    private formBuilder: FormBuilder,
    private observableMedia: ObservableMedia ) {
      this.translationLoader.loadTranslations(english, spanish);
      this.settingsForm.get('autoPocketSelectionRules').setValidators([ Validators.required, this.validateAllAutoPocketSelection.bind(this) ]);
      this.settingsForm.get('productBonusConfigs').setValidators([ Validators.required, this.validateAllProductRules.bind(this) ]);
      this.settingsForm.setValidators([this.validateAll.bind(this)]);
  }


  ngOnInit() {

    const grid = new Map([['xs', 1], ['sm', 2], ['md', 3], ['lg', 4], ['xl', 5]]);
    let start: number;
    grid.forEach((cols, mqAlias) => {
      if (this.observableMedia.isActive(mqAlias)) {
        start = cols;
      }
    });

    this.observableMedia.asObservable()
      .map(change => grid.get(change.mqAlias))
      .startWith(start)
      .subscribe((e: number) => { this.screenMode = e; }, err => console.log(err));

    this.route.params
    .pipe(
      filter(params => params['buId']),
      map(params => params['buId']),
      mergeMap(buId => this.walletSpendingRuleService.getSpendinRule$(buId)),
      map(rule => JSON.parse(JSON.stringify(rule))),
      tap(spendingRule => this.selectedSpendingRule = spendingRule),
      mergeMap(spendingRule => this.loadSpendingRule$(spendingRule))
    )
    .subscribe(p => {}, e => console.log(e), () => console.log('Completed'));

    this.walletSpendingRuleService.getTypeAndConcepts$()
    .pipe(
      tap(r => console.log(r))
    )
    .subscribe(p => {}, e => console.log(e), () => console.log('Completed'));


  }

  /**
   *
   * @param businesId Business id to search its spending rule
   */
  loadSpendingRule$(spendingRule: any){
    return Rx.Observable.of(spendingRule)
    .pipe(
      mergeMap((spendingRuleItem: SpendingRule) => Rx.Observable.forkJoin(
        Rx.Observable.of(spendingRuleItem)
        .pipe(
          tap(sr => {
            this.settingsForm.get('businessName').setValue(sr.businessName);
            this.settingsForm.get('businessId').setValue(sr.businessId);
            this.settingsForm.addControl('minOperationAmount', new FormControl(sr.minOperationAmount, [ Validators.required ]) );
            // get('minOperationAmount').setValue(sr.minOperationAmount);
          })
        ),
        Rx.Observable.of(spendingRuleItem)
        .pipe(
          filter(rule => (rule.autoPocketSelectionRules != null) ),
          map(sr => sr.autoPocketSelectionRules.sort((a: AutoPocketRule , b: AutoPocketRule) => a.priority - b.priority )),
          mergeMap(autoPocketRules =>
            from(autoPocketRules).pipe(
              tap(autoPocketRule =>  this.addAutoPocketSelectionRule(autoPocketRule)  )
            )
          )
        ),
        Rx.Observable.of(spendingRuleItem)
        .pipe(
          filter(rule => (rule.productBonusConfigs != null) ),
          map(sr => sr.productBonusConfigs),
          mergeMap(productRules =>
            from(productRules).pipe(
              tap(productRule =>  this.addProductSetting(productRule))
            )
          )
        )
      )
      )
    );
  }

  addProductSetting(productConfig?: ProductConfigRule ): void {
    const items = this.settingsForm.get('productBonusConfigs') as FormArray;
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
        pocketToUse: 'BALANCE',
        condition: {
          pocket: 'BALANCE',
          comparator: 'ENOUGH',
          value: null
        }
      };
    }
    return this.formBuilder.group({
      priority: new FormControl({ value: pocketRule.priority, disabled: !this.currentVersion }, [Validators.required, Validators.min(1)]),
      pocketToUse: new FormControl({ value: pocketRule.pocketToUse, disabled: !this.currentVersion }, [Validators.required]),
      pocket: new FormControl({ value: pocketRule.condition.pocket, disabled: !this.currentVersion }, [Validators.required]),
      comparator: new FormControl({ value: pocketRule.condition.comparator, disabled: !this.currentVersion }, [Validators.required]),
      value: new FormControl({ value: pocketRule.condition.value, disabled: !this.currentVersion }, [Validators.required, this.validatePercentages.bind(this) ])
    });
  }

  createProductSetting(productConfig?: ProductConfigRule) {
    if (!productConfig){
      productConfig = {
        type: '',
        concept: '',
        bonusType: 'PERCENTAGE',
        bonusValueByBalance: 0,
        bonusValueByCredit: 0
      };
    }
    return this.formBuilder.group({
      type: new FormControl( { value: productConfig.type, disabled: !this.currentVersion },
        [Validators.required, Validators.minLength(5), Validators.maxLength(30)]),
      concept: new FormControl({ value: productConfig.concept, disabled: !this.currentVersion },
        [ Validators.required, Validators.minLength(5), Validators.maxLength(30)]),
      bonusType: new FormControl({ value: productConfig.bonusType, disabled: !this.currentVersion }, [Validators.required]),
      bonusValueByBalance: new FormControl({ value: productConfig.bonusValueByBalance, disabled: !this.currentVersion }, [
          Validators.required,
          Validators.min(0),
          Validators.max(100)
        ]
      ),
      bonusValueByCredit: new FormControl({ value: productConfig.bonusValueByCredit, disabled: !this.currentVersion }, [
        Validators.required,
        Validators.min(0),
        Validators.max(100)
      ]
    )
    });
  }

  updateProductBonusConfig(index){
    const productBonusConfigs = this.settingsForm.get('productBonusConfigs') as FormArray;
    // productBonusConfigs.controls[index].get('bonusValueByBalance').updateValueAndValidity();
  }


  validatePercentages(): { [s: string]: boolean } {
    const reloaders = this.settingsForm.get('productBonusConfigs') as FormArray;
    const index = reloaders.getRawValue().findIndex(e => ( e.bonusValueByBalance >= 100 || e.bonusValueByCredit >= 100 || ( e.comparator === 'ENOUGH' && !e.value  ) ));
    return (index !== -1) ? { 'percentageExceeded': true } : null;
  }

  validateAllProductRules(): { [s: string]: boolean } {
    const reloaders = this.settingsForm.get('productBonusConfigs') as FormArray;
    const index = reloaders.getRawValue().findIndex(e => e.concept === '' || e.concept == null || e.type === '' || e.type == null );
    return (index !== -1) ? { 'typeOrConceptInvalidInArray': true } : null;
  }

  validateAllAutoPocketSelection(): { [s: string]: boolean } {
    const reloaders = this.settingsForm.get('productBonusConfigs') as FormArray;
    const index = reloaders.getRawValue().findIndex(e => ( e.type == null || e.concept == null ));
    return (index !== -1) ? { 'typeOrConceptInvalid': true } : null;
  }

  validateValue(): { [s: string]: boolean } {
    const reloaders = this.settingsForm.get('autoPocketSelectionRules') as FormArray;
    const index = reloaders.getRawValue().findIndex(e => (e.comparator !== 'ENOUGH' && e.value == null ) );
    return (index !== -1) ? { 'valueRequired': true } : null;
  }

  validateAll(): { [s: string]: boolean } {
    let error = null;
    let controls = this.settingsForm.get('autoPocketSelectionRules') as FormArray;
    let index = controls.getRawValue().findIndex(e => (e.comparator !== 'ENOUGH' && e.value == null ) );
    error = (index !== -1) ? { 'valueRequired': true } : null;
    if (error){ return error; }
    controls = this.settingsForm.get('productBonusConfigs') as FormArray;
    index = controls.getRawValue().findIndex(e => ( e.type === '' || !e.type || e.concept === '' || !e.concept ) );
    error = (index !== -1) ? { 'conceptAndtypeRequired': true } : null;
    if (error){ return error; }
  }

  saveSpendingRule() {
    Rx.Observable.of(this.settingsForm.getRawValue())
      .pipe(map(
        ({
          businessId,
          minOperationAmount,
          productBonusConfigs,
          autoPocketSelectionRules
        }) => ({
          businessId,
          minOperationAmount,
          productBonusConfigs: productBonusConfigs.reduce(
            (acc, p) => {
              acc.push({
                type: p.type.toUpperCase(),
                concept: p.concept.toUpperCase(),
                bonusType: p.bonusType,
                bonusValueByBalance: p.bonusValueByBalance,
                bonusValueByCredit: p.bonusValueByCredit
              });
              return acc;
            },
            []
          ),
          autoPocketSelectionRules: autoPocketSelectionRules.reduce(
            (acc, p) => {
              acc.push({
                priority: p.priority,
                pocketToUse: p.pocketToUse,
                condition: {
                  pocket: p.pocket,
                  comparator: p.comparator,
                  value: p.value
                }
              });
              return acc;
            },
            []
          )
        })
      ),
        tap((sr: SpendingRule) => this.selectedSpendingRule = {...this.selectedSpendingRule, ... sr}),
        mergeMap(spendingRuleUpdate => this.walletSpendingRuleService.updateSpendingRule$(spendingRuleUpdate))
      )
      .subscribe(r => {}, e => console.log(), () => {});
  }

  undoChanges(){
    return Rx.Observable.of(this.selectedSpendingRule)
    .pipe(
      tap(() => {
        this.settingsForm = new FormGroup({
          businessId: new FormControl({value: '', disabled: true}, [Validators.required]),
          businessName: new FormControl({value: '', disabled: true}, [Validators.required]),
          // minOperationAmount: new FormControl(null, [Validators.required]),
          productBonusConfigs: new FormArray([], [Validators.required]),
          autoPocketSelectionRules: new FormArray([], [Validators.required])
        });
      }),
      mergeMap(() => this.loadSpendingRule$(this.selectedSpendingRule) )
    )
    .subscribe(r => {}, e => console.log(e), () => console.log('Completed') );
  }

  ngOnDestroy() {
  }

}
