////////// ANGULAR //////////
import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";

////////// RXJS ///////////
import {
  map,
  mergeMap,
  toArray,
  filter,
  tap,
  takeUntil,
  startWith,
  debounceTime,
  distinctUntilChanged
} from "rxjs/operators";
import { Subject, fromEvent } from "rxjs";

//////////// Services ////////////
import { KeycloakService } from "keycloak-angular";
import { WalletService } from "./../wallet.service";
import { TransactionHistoryDetailService } from "./transaction-history-detail.service";

//////////// i18n ////////////
import { FuseTranslationLoaderService } from "../../../../core/services/translation-loader.service";
import { TranslateService } from "@ngx-translate/core";
import { locale as english } from "../i18n/en";
import { locale as spanish } from "../i18n/es";

//////////// ANGULAR MATERIAL ///////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar
} from "@angular/material";
import { fuseAnimations } from "../../../../core/animations";

@Component({
  selector: 'app-transaction-history-detail',
  templateUrl: './transaction-history-detail.component.html',
  styleUrls: ['./transaction-history-detail.component.scss']
})
export class TransactionHistoryDetailComponent implements OnInit, OnDestroy {

  private ngUnsubscribe = new Subject();

  // Table data
  dataSource = new MatTableDataSource();
  // Columns to show in the table
  displayedColumns = ['timestamp', 'type', 'concept', 'value', 'pocket', 'user' ];

  userRoles: any;
  isSystemAdmin: Boolean = false;

  selectedTransactionHistory: any = {
    terminal: {}
  };
  selectedBusiness: any = null;

  constructor(
    private translationLoader: FuseTranslationLoaderService,
    private keycloakService: KeycloakService,
    private activatedRouter: ActivatedRoute,
    private walletService: WalletService,
    private transactionHistoryDetailService: TransactionHistoryDetailService,
  ) {
    this.translationLoader.loadTranslations(english, spanish);
  }

  ngOnInit() {
    console.log('ngOnInit');
    this.checkIfUserIsSystemAdmin();
    this.loadTransactionHistory();
  }

    /**
   * Checks if the user is system admin
   */
  async checkIfUserIsSystemAdmin(){
    this.userRoles = await this.keycloakService.getUserRoles(true);
    this.isSystemAdmin = this.userRoles.some(role => role === 'SYSADMIN');
  }

  /**
   * Loads the transaction history according to the url param
   */
  loadTransactionHistory() {
    this.activatedRouter.params
      .pipe(
        tap(params => console.log('New params => ', params)),
        mergeMap(params => this.transactionHistoryDetailService.getTransactionHistoryById$(params.id)
        .map(transactionHistory => transactionHistory.data.getWalletTransactionsHistoryById)),
        mergeMap(transactionHistory => {
          return this.transactionHistoryDetailService.getAssociatedTransactionsHistoryByTransactionHistoryId$(transactionHistory._id)
          .pipe(
            map(associatedTransactionHistory => [transactionHistory, associatedTransactionHistory.data.getAssociatedTransactionsHistoryByTransactionHistoryId])
          )        
        }),
        mergeMap(([transactionHistory, associatedTransactionIds]) => {
          return this.getBusinessById$(transactionHistory.businessId).map(business => [transactionHistory, associatedTransactionIds, business]);
        })
      )
      .subscribe(([transactionHistory, associatedTransactionIds, business]) => {
        

        this.selectedTransactionHistory = {
          ...transactionHistory,
          terminal: transactionHistory.terminal || {}
        };
        this.selectedTransactionHistory.terminal = {
          id: this.selectedTransactionHistory.terminal.id || ' ',
          userId: this.selectedTransactionHistory.terminal.userId || ' ',
          username: this.selectedTransactionHistory.terminal.username || ' ',
        };        
        console.log('transactionHistory => ', this.selectedTransactionHistory);
        this.selectedBusiness = business;        
        this.dataSource.data = associatedTransactionIds;
      });
  }

    /**
   * get the business by id
   * @returns {Observable}
   */
  getBusinessById$(id){
    return this.walletService.getBusinessById$(id)
    .pipe(map((res: any) => res.data.getBusinessById));
  }

    /**
   * Receives the selected transaction history
   * @param transactionHistory selected transaction history
   */
  selectTransactionHistoryRow(transactionHistory){
    this.selectedTransactionHistory = transactionHistory;
  }



  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

}