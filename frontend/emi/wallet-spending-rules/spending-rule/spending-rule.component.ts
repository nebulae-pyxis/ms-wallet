import { tap } from 'rxjs/operators';
import { FuseTranslationLoaderService } from './../../../../core/services/translation-loader.service';
import { Observable } from 'rxjs/Observable';
import { WalletSpendingRuleService } from '../wallet-spending-rules.service';
import { Component, OnDestroy, OnInit, Input } from '@angular/core';
import { fuseAnimations } from '../../../../core/animations';
import { Subscription } from 'rxjs/Subscription';
// tslint:disable-next-line:import-blacklist
import * as Rx from 'rxjs/Rx';
import { FormGroup, FormControl, Validators, FormArray, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, mergeMap, map } from 'rxjs/operators';
import { ObservableMedia } from '@angular/flex-layout';
import { syntaxError } from '@angular/compiler';
import { forkJoin, from } from 'rxjs';
import { locale as english } from '../i18n/en';
import { locale as spanish } from '../i18n/es';


export interface SpendingRule {
  id: string;
  businessId: String;
  businessName: String;
  editedBy: string;
  lastEdition: number;
  minOperationAmount: number;
  autoPocketSelection: AutoPocketRule[];
  productUtilitiesConfig: ProductConfigRule[];
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
  when: { pocket: string, comparator: string, value: number | null };
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

  settingsForm: FormGroup = new FormGroup({
    businessId: new FormControl({value: '', disabled: true}, [Validators.required]),
    businessName: new FormControl({value: '', disabled: true}, [Validators.required]),
    minOperationAmount: new FormControl(null, [Validators.required]),
    productUtilitiesConfig: new FormArray([], [Validators.required]),
    autoPocketSelection: new FormArray([], [Validators.required])
  });

  constructor(
    private walletSpendingRuleService: WalletSpendingRuleService,
    private route: ActivatedRoute,
    private translationLoader: FuseTranslationLoaderService,
    private formBuilder: FormBuilder,
    private observableMedia: ObservableMedia,
    private router: Router  ) {
      this.translationLoader.loadTranslations(english, spanish);
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
      .subscribe((e: number) => { this.screenMode = e; console.log(e); }, err => console.log(err));

    this.route.params
    .pipe(
      filter(params => params['buId']),
      map(params => params['buId']),
      tap(r => console.log('Business Id: ', r)),
      mergeMap(buId => this.walletSpendingRuleService.getSpendinRule$(buId)),
      map(rule => JSON.parse(JSON.stringify(rule))),
      tap(spendingRule => this.selectedSpendingRule = spendingRule),
      mergeMap(spendingRule => this.loadSpendingRule$(spendingRule))
    )
    .subscribe(p => console.log('Query params', p), e => console.log(e), () => console.log('Completed'));
  }

  /**
   *
   * @param businesId Business id to search its spending rule
   */
  loadSpendingRule$(spendingRule: any){
    console.log('Spending RUle ==> ', spendingRule);
    return Rx.Observable.of(spendingRule)
    .pipe(
      mergeMap((spendingRuleItem: SpendingRule) => Rx.Observable.forkJoin(
        Rx.Observable.of(spendingRuleItem)
        .pipe(
          tap(sr => {
            this.settingsForm.get('businessName').setValue(sr.businessName);
            this.settingsForm.get('businessId').setValue(sr.businessId);
            this.settingsForm.get('minOperationAmount').setValue(sr.minOperationAmount);
          })
        ),
        Rx.Observable.of(spendingRuleItem)
        .pipe(
          filter(rule => (rule.autoPocketSelection != null) ),
          map(sr => sr.autoPocketSelection.sort((a: AutoPocketRule , b: AutoPocketRule) => a.priority - b.priority )),
          mergeMap(autoPocketRules =>
            from(autoPocketRules).pipe(
              tap(autoPocketRule =>  this.addAutoPocketSelectionRule(autoPocketRule)  )
            )
          )
        ),
        Rx.Observable.of(spendingRuleItem)
        .pipe(
          filter(rule => (rule.productUtilitiesConfig != null) ),
          map(sr => sr.productUtilitiesConfig),
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
    const items = this.settingsForm.get('productUtilitiesConfig') as FormArray;
    items.push(this.createProductSetting( productConfig ));
  }
  addAutoPocketSelectionRule(autoPocketRule?: AutoPocketRule ): void {
    const items = this.settingsForm.get('autoPocketSelection') as FormArray;
    items.push(this.createAutoPocketRule( autoPocketRule ));
  }

  deleteControl(formType: string, index: number){
    const formGroup = this.settingsForm.get(formType) as FormArray;
    formGroup.removeAt(index);
  }

  createAutoPocketRule(pocketRule: AutoPocketRule) {
    if (!pocketRule){
      pocketRule = {
        priority : (this.settingsForm.get('autoPocketSelection') as FormArray).length + 1,
        toUse: 'MAIN',
        when: {
          pocket: 'MAIN',
          comparator: 'ENOUGH',
          value: null
        }
      };
    }
    return this.formBuilder.group({
      priority: new FormControl({ value: pocketRule.priority, disabled: !this.currentVersion }, [Validators.required, Validators.min(1)]),
      toUse: new FormControl({ value: pocketRule.toUse, disabled: !this.currentVersion }, [Validators.required]),
      pocket: new FormControl({ value: pocketRule.when.pocket, disabled: !this.currentVersion }, [Validators.required]),
      comparator: new FormControl({ value: pocketRule.when.comparator, disabled: !this.currentVersion }, [Validators.required]),
      value: new FormControl({ value: pocketRule.when.value, disabled: !this.currentVersion }, [ this.validatePercentages.bind(this) ]),
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


  validatePercentages(): { [s: string]: boolean } {
    const reloaders = this.settingsForm.get('productUtilitiesConfig') as FormArray;
    const index = reloaders.getRawValue().findIndex(e => ( e.percentageByMain >= 100 || e.percentageByCredit >= 100 ));
    return (index !== -1) ? { 'percentageExceeded': true } : null;
  }

  validateValue(): { [s: string]: boolean } {
    const reloaders = this.settingsForm.get('autoPocketSelection') as FormArray;
    const index = reloaders.getRawValue().findIndex(e => (e.comparator !== 'ENOUGH' && e.value == null ) );
    return (index !== -1) ? { 'valueRequired': true } : null;
  }

  saveSpendingRule() {
    const update = this.settingsForm.getRawValue();
    console.log('Spending rule to send', update);
    Rx.Observable.of(this.settingsForm.getRawValue())
      .pipe(map(
        ({
          businessId,
          minOperationAmount,
          productUtilitiesConfig,
          autoPocketSelection
        }) => ({
          businessId,
          minOperationAmount,
          productUtilitiesConfig,
          autoPocketSelection: autoPocketSelection.reduce(
            (acc, p) => {
              console.log('Before', acc);
              acc.push({
                priority: p.priority,
                toUse: p.toUse,
                when: {
                  pocket: p.pocket,
                  comparator: p.comparator,
                  value: p.value
                }
              });
              console.log('AFTER', acc);
              return acc;
            },
            []
          )
        })
      ),
        tap(r => console.log('TERMINA DE HACER EL MAPPING', r)),
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
          minOperationAmount: new FormControl(null, [Validators.required]),
          productUtilitiesConfig: new FormArray([], [Validators.required]),
          autoPocketSelection: new FormArray([], [Validators.required])
        });
      }),
      mergeMap(() => this.loadSpendingRule$(this.selectedSpendingRule) )
    )
    .subscribe(r => console.log(), e => console.log(e), () => console.log('Completed') );

  }

  ngOnDestroy() {
  }

}
