import { WalletSpendingRuleService } from './wallet-spending-rules.service';
import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { fuseAnimations } from '../../../core/animations';
import { TranslateService } from '@ngx-translate/core';
import { FuseTranslationLoaderService } from './../../../core/services/translation-loader.service';
import { locale as english } from './i18n/en';
import { locale as spanish } from './i18n/es';
// tslint:disable-next-line:import-blacklist
import * as Rx from 'rxjs/Rx';
import { MatTableDataSource } from '@angular/material';
import { debounceTime, startWith, distinctUntilChanged, filter, map, tap, mergeMap } from 'rxjs/operators';

export interface SpendingRule{
  businessId: string;
  businessName: string;
  minOperationAmount: number;
  lastEdition: number;
  editedBy: string;
}

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'wallet-spending-rules',
  templateUrl: './wallet-spending-rules.component.html',
  styleUrls: ['./wallet-spending-rules.component.scss'],
  animations: fuseAnimations
})
export class WalletComponent implements OnInit, OnDestroy {

  @ViewChild('filter') filter: ElementRef;

  spendingRulesDataSource = new MatTableDataSource();
  allSubscriptions = [];
  tableColumns: string[] = ['businessId', 'businessName', 'minOperationAmount', 'lastEdition', 'editedBy'];


  tableSize: number;
  page = 0;
  count = 10;
  filterText = '';
  sortColumn = null;
  sortOrder = null;
  itemPerPage = '';

  constructor(
    private walletSpendingService: WalletSpendingRuleService,
    private translationLoader: FuseTranslationLoaderService,
    private translatorService: TranslateService
    ) {
      this.translationLoader.loadTranslations(english, spanish);
      this.spendingRulesDataSource.data = [ {
        businessId: 'GANA_MED_015',
         businessName: 'GANA',
         minOperationAmount: 1000000,
         lastEdition: 1234656987,
         editedBy: 'juan.santa'
      }];
  }


  ngOnInit() {

    /**
     * subscription to listen the filter text
     */
    this.allSubscriptions.push(
      Rx.Observable.fromEvent(this.filter.nativeElement, 'keyup')
        .pipe(
          debounceTime(400),
          startWith(''),
          distinctUntilChanged(),
          filter(() => this.filter.nativeElement),
          map(() => this.filter.nativeElement.value.trim()),
          tap((filterText => this.filterText = filterText)),
          mergeMap(() => this.walletSpendingService.getSpendinRules$(this.page, this.count, this.filterText, this.sortColumn, this.sortOrder)),
          // map(response => response.data.getTags),
          // mergeMap((responseArray) => this.loadRowDataInDataTable$(responseArray))
        )
        .subscribe((r) => { console.log(r); }, (error) => console.log(error), () => { })
    );

  }


  ngOnDestroy() {
  }

}
