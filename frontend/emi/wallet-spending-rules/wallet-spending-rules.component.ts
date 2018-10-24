import { WalletService } from './wallet-spending-rules.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { fuseAnimations } from '../../../core/animations';
import { TranslateService } from '@ngx-translate/core';
import { FuseTranslationLoaderService } from './../../../core/services/translation-loader.service';
import { locale as english } from './i18n/en';
import { locale as spanish } from './i18n/es';
// tslint:disable-next-line:import-blacklist
import * as Rx from 'rxjs/Rx';
import { MatTableDataSource } from '@angular/material';

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

  spendingRulesDataSource = new MatTableDataSource();

  tableColumns: string[] = ['businessId', 'businessName', 'minOperationAmount', 'lastEdition', 'editedBy'];
  tableSize: number;

  constructor(
    private walletervice: WalletService,
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
  }


  ngOnDestroy() {
  }

}
