////////// ANGULAR //////////
import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  ViewChild,
  ElementRef
} from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators
} from "@angular/forms";

////////// RXJS ///////////
// tslint:disable-next-line:import-blacklist
import * as Rx from "rxjs/Rx";
import {
  map,
  mergeMap,
  toArray,
  filter,
  tap,
  takeUntil,
  startWith,
  debounceTime,
  distinctUntilChanged,
  take
} from "rxjs/operators";
import { Subject, fromEvent, of, forkJoin, Observable } from "rxjs";

//////////// ANGULAR MATERIAL ///////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar
} from "@angular/material";
import { fuseAnimations } from "../../../../core/animations";

//////////// i18n ////////////
import { FuseTranslationLoaderService } from "../../../../core/services/translation-loader.service";
import { TranslateService } from "@ngx-translate/core";
import { locale as english } from "../i18n/en";
import { locale as spanish } from "../i18n/es";

//////////// Services ////////////
import { KeycloakService } from "keycloak-angular";
import { WalletService } from "./../wallet.service";
import { TransactionHistoryService } from "./transaction-history.service";

import {
  MAT_MOMENT_DATE_FORMATS,
  MomentDateAdapter
} from "@angular/material-moment-adapter";
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE
} from "@angular/material/core";
import * as moment from "moment";

@Component({
  selector: "app-transaction-history",
  templateUrl: "./transaction-history.component.html",
  styleUrls: ["./transaction-history.component.scss"],
  animations: fuseAnimations
  // providers: [
  //   {provide: MAT_DATE_LOCALE, useValue: 'ja-JP'},
  //   {provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE]},
  //   {provide: MAT_DATE_FORMATS, useValue: MAT_MOMENT_DATE_FORMATS},
  // ]
})
export class TransactionHistoryComponent implements OnInit, OnDestroy {
  private ngUnsubscribe = new Subject();

  businessFilterCtrl: FormControl;
  filterForm: FormGroup;
  // Table data
  dataSource = new MatTableDataSource();
  // Columns to show in the table
  displayedColumns = [
    "timestamp",
    "type",
    "concept",
    "value",
    "pocket",
    "user"
  ];

  transactionTypes: any = ["SALE", "BALANCE_ADJUSTMENT"];
  transactionConcepts: any = ["RECARGA_CIVICA", "PAYMENT"];
  typesAndConceptsList: any = null;

  myBusiness: any = null;
  allBusiness: any = [];
  selectedBusinessData: any = null;
  selectedTransactionHistory: any = null;
  isSystemAdmin: Boolean = false;

  businessQueryFiltered$: Observable<any[]>;

  walletData: any = {
    spendingState: "",
    pockets: {
      balance: 0,
      bonus: 0,
      credit: 0
    }
  };

  terminalIdInput: any;
  terminalUserId: any;
  terminalUsername: any;
  transactionType: any;

  maxEndDate: any = null;
  minEndDate: any = null;  

  // Table values
  @ViewChild(MatPaginator)
  paginator: MatPaginator;
  @ViewChild("filter")
  filter: ElementRef;
  @ViewChild(MatSort)
  sort: MatSort;
  tableSize: number;
  page = 0;
  count = 10;
  filterText = "";
  sortColumn = null;
  sortOrder = null;
  itemPerPage = "";

  constructor(
    private formBuilder: FormBuilder,
    private translationLoader: FuseTranslationLoaderService,
    private translate: TranslateService,
    private snackBar: MatSnackBar,
    private router: Router,
    private activatedRouter: ActivatedRoute,
    private keycloakService: KeycloakService,
    private walletService: WalletService,
    private transactionHistoryService: TransactionHistoryService,
    private adapter: DateAdapter<any>
  ) {
    this.translationLoader.loadTranslations(english, spanish);
    this.businessFilterCtrl = new FormControl();
  }

  ngOnInit() {
    this.buildFilterForm();
    this.loadTypesAndConcepts();
    this.loadBusinessFilter();
    this.loadDataInForm();
    this.detectFilterAndPaginatorChanges();
    this.loadRoleData();
    this.loadBusinessData();
    this.loadWalletData();
    this.refreshTransactionHistoryTable();
  }

  buildFilterForm() {
    const startOfMonth = moment().startOf("month");
    const endOfMonth = moment();
    this.minEndDate = startOfMonth;
    this.maxEndDate = endOfMonth;
    // Reactive Form
    this.filterForm = this.formBuilder.group({
      initDate: [startOfMonth],
      endDate: [endOfMonth],
      terminalId: [""],
      terminalUserId: [""],
      terminalUsername: [""],
      transactionType: [null],
      transactionConcept: [null]
    });
    this.filterForm.disable({
      onlySelf: true,
      emitEvent: false
    });
  }

  compareIds(business1: any, business2: any): boolean {
    return business1 && business2 ? business1._id === business2._id : business1 === business2;
}

displayFn(business) {
  return (business || {}).name;
}


  loadDataInForm() {
    Rx.Observable.combineLatest(
      this.transactionHistoryService.filterAndPaginator$,
      this.transactionHistoryService.selectedBusinessEvent$
    )
      .pipe(take(1))
      .subscribe(([filterAndPaginator, selectedBusiness]) => {
        console.log('filterAndPaginator ==>>> ', filterAndPaginator);
        console.log('selectedBusiness ==>>> ', selectedBusiness);
        if (filterAndPaginator) {
          if(filterAndPaginator.filter){
            const filter: any = filterAndPaginator.filter;
            const terminal:any = filterAndPaginator.filter.terminal || {};
            this.filterForm.patchValue({
              initDate: filter.initDate,
              endDate: filter.endDate,
              terminalId:  terminal.id,
              terminalUserId: terminal.userId,
              terminalUsername: terminal.username,
              transactionType: filter.transactionType,
              transactionConcept: filter.transactionConcept
            });
          }

          if(filterAndPaginator.pagination){
            this.page = filterAndPaginator.pagination.page,
            this.count = filterAndPaginator.pagination.count;
          }
        }

        if (selectedBusiness) {
          this.selectedBusinessData = selectedBusiness;
          this.businessFilterCtrl.setValue(this.selectedBusinessData);
        }
        this.filterForm.enable({ onlySelf: false, emitEvent: true});
        this.filterForm.updateValueAndValidity({ onlySelf: false, emitEvent: true});
      });
  }

  /**
   * Paginator of the table
   */
  getPaginator$() {
    return this.paginator.page
    .pipe(startWith({ pageIndex: 0, pageSize: 10 }));
  }

  loadTypesAndConcepts() {
    this.transactionHistoryService.getTypesAndConcepts$()
    .pipe(
      map(result => result.data.typeAndConcepts),
      takeUntil(this.ngUnsubscribe)
    )
    .subscribe(data => {
      this.typesAndConceptsList = data;
    })
  }

  /**
   * get the wallet data according to the selected business
   */
  loadWalletData() {
    this.transactionHistoryService.selectedBusinessEvent$
      .pipe(
        //tap(data => console.log('selected business wallet  => ', data)),
        filter(selectedBusiness => selectedBusiness != null),
        mergeMap((selectedBusiness: any) =>
          this.walletService.getWallet$(selectedBusiness._id)
        ),
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
        map(result => result.data.getWallet),
        map(wallet => {
          let credit = 0;
          if(wallet.pockets.balance < 0){
            credit += wallet.pockets.balance;
          }

          if(wallet.pockets.bonus < 0){
            credit += wallet.pockets.bonus;
          }
          const walletCopy = {
            ...wallet,
            pockets: {
              balance: wallet.pockets.balance < 0 ? 0 : wallet.pockets.balance,
              bonus: wallet.pockets.bonus < 0 ? 0 : wallet.pockets.bonus,
              credit: credit,
            }
          };
          return walletCopy;
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(wallet => {
        this.walletData = wallet;
      });
  }

  /**
   *
   * @param element Element HTML
   */
  getFormChanges$() {
    return this.filterForm.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      tap(val => console.log('getFormChanges$'))
      //startWith({ initDate: this.filterForm.get('initDate').value, endDate: this.filterForm.get('endDate').value })
    );
  }

  onInitDateChange() {
    const start = this.filterForm.get('initDate').value;
    const end = this.filterForm.get('endDate').value;

    const startMonth = start.month();
    const startYear = start.year();
    const startMonthYear = startMonth+'-'+startYear;

    const endMonth = end.month();
    const endYear = end.year();
    const endMonthYear = endMonth+'-'+endYear;
    
    this.minEndDate = moment(start);
    if(startMonthYear != endMonthYear){
      console.log('Select last day of month or current date');
      this.filterForm.patchValue({
        endDate: start.endOf("month")
      });
      this.maxEndDate = start.endOf("month"); 
    }else{
      console.log('Same month');
    }
    
    console.log('minEndDate => ', this.minEndDate.format('MMMM Do YYYY, h:mm:ss a'));
    console.log('maxEndDate => ', this.maxEndDate.format('MMMM Do YYYY, h:mm:ss a'));
  }

  onEndDateChange() {
    // const start = this.filterForm.get('initDate').value;
    // this.minEndDate = moment(start);
  }

  resetFilter() {
    this.filterForm.reset();
    this.paginator.pageIndex = 0;
    this.page = 0;
    this.count = 10;

    const startOfMonth = moment().startOf("month");
    const endOfMonth = moment().endOf("month");
    this.filterForm.patchValue({
      initDate: startOfMonth,
      endDate: endOfMonth
    });
  }

  detectFilterAndPaginatorChanges() {
    Rx.Observable.combineLatest(this.getFormChanges$(), this.getPaginator$())
      .pipe(
        tap(data => console.log('detectFilterAndPaginatorChanges => ', data)),
        filter(data => {
          return this.filterForm.enabled;
        }),
        map(([formChanges, paginator]) => {
          return {
            filter: {
              initDate: formChanges.initDate,
              endDate: formChanges.endDate,
              transactionType: formChanges.transactionType,
              transactionConcept: formChanges.transactionConcept,
              terminal: {
                id: formChanges.terminalId,
                userId: formChanges.terminalUserId,
                username: formChanges.terminalUsername
              }
            },
            pagination: {
              page: paginator.pageIndex,
              count: paginator.pageSize,
              sort: 1
            }
          };
        }),
        tap(filterAndPagination =>
          this.transactionHistoryService.addFilterAndPaginatorData(
            filterAndPagination
          )
        ),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(data => {
        //console.log('TEST$ => ', data);
      });
  }

  /**
   * Refreshes the table data according to the filters and the paginator.
   */
  refreshTransactionHistoryTable() {
    Rx.Observable.combineLatest(
      this.transactionHistoryService.filterAndPaginator$,
      this.transactionHistoryService.selectedBusinessEvent$
    )
      .pipe(
        filter(([filterAndPagination, selectedBusiness]) =>{
          console.log('refreshTable => ', ([filterAndPagination, selectedBusiness]));
          return filterAndPagination != null && selectedBusiness != null;
        }),
        map(([filterAndPagination, selectedBusiness]) => {
          console.log("[1filterAndPagination, selectedBusiness] => ", [
            filterAndPagination,
            selectedBusiness
          ]);

          const filterInput: any = filterAndPagination.filter;
          filterInput.initDate = filterInput.initDate
            ? filterInput.initDate.valueOf()
            : null;
          filterInput.endDate = filterInput.endDate
            ? filterInput.endDate.valueOf()
            : null;
          filterInput.businessId = selectedBusiness._id;

          filterInput.transactionType = filterInput.transactionType ? filterInput.transactionType.type : undefined;

          const paginationInput = filterAndPagination.pagination;
          console.log('filterInput => ', filterInput);
          return [filterInput, paginationInput];
          // return this.transactionHistoryService.getTransactionsHistory$(
          //   filterInput,
          //   paginationInput
          // );
        }),
        mergeMap(([filterInput, paginationInput]) => {
          return forkJoin(
            this.transactionHistoryService.getTransactionsHistory$(filterInput,paginationInput)
            .pipe(
              mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp))
            ),
            this.transactionHistoryService.getTransactionsHistoryAmount$(filterInput)
            .pipe(
              mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp))
            ),
          )
        }),
        //filter((resp: any) => !resp.errors || resp.errors.length === 0),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(([transactionsHistory, transactionsHistoryAmount]) => {
        console.log('transactionsHistoryAmount => ', transactionsHistoryAmount);
        this.dataSource.data =
          transactionsHistory.data.getWalletTransactionsHistory;
          this.tableSize = transactionsHistoryAmount.data.getWalletTransactionsHistoryAmount;
      });
  }

  /**
   *
   */
  loadRoleData() {
    this.checkIfUserIsAdmin$()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(hasSysAdminRole => {
        this.isSystemAdmin = hasSysAdminRole;
      });
  }

  /**
   * Creates the transaction history filter
   */
  createTransactionHistoryFilterForm() {
    return this.formBuilder.group({});
  }

  /**
   * Checks if the logged user has role SYSADMIN
   */
  checkIfUserIsAdmin$() {
    return Rx.Observable.of(this.keycloakService.getUserRoles(true)).pipe(
      map(userRoles => userRoles.some(role => role === "SYSADMIN"))
    );
  }

  /**
   * Loads business data
   */
  loadBusinessData() {
    return this.checkIfUserIsAdmin$()
      .pipe(
        mergeMap(hasSysAdminRole => {
          return forkJoin(
            of(hasSysAdminRole),
            this.getBusiness$(),
            hasSysAdminRole ? this.getAllBusiness$() : of([])
          );
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(([hasSysAdminRole, myBusiness, allBusinesses]) => {
        this.myBusiness = myBusiness;
        this.allBusiness = allBusinesses;

        // If the user is not SYSADMIN, he will be only able to see info about its business, therefore the business is selected automatically.
        if (!hasSysAdminRole && this.myBusiness) {
          this.onSelectBusinessEvent(this.myBusiness);
        }
      });
  }

  loadBusinessFilter(){
    this.businessQueryFiltered$ =
      this.businessFilterCtrl.valueChanges.pipe(
        startWith(undefined),
        debounceTime(500),
        distinctUntilChanged(),
        mergeMap((filterText:String) => {
          return this.getBusinessFiltered(filterText, 10);
        })
      );
  }

  getBusinessFiltered(filterText: String, limit: number): Observable<any[]> {
    return this.walletService
      .getBusinessByFilter(filterText, limit)
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter(resp => !resp.errors),
        mergeMap(result => Observable.from(result.data.getBusinessByFilter)),
        toArray()
      );
  }

  /**
   * get the business which the user belongs
   */
  getBusiness$() {
    return this.walletService
      .getBusiness$()
      .pipe(map(res => res.data.getWalletBusiness));
  }

  /**
   * Creates an observable of business
   */
  getAllBusiness$() {
    return this.walletService.getBusinesses$().pipe(
      mergeMap(res => {
        return Rx.Observable.from(res.data.getWalletBusinesses);
      }),
      map((business: any) => {
        return {
          _id: business._id,
          name: business.name
        };
      }),
      toArray()
    );
  }

  /**
   * Receives the selected transaction history
   * @param transactionHistory selected transaction history
   */
  selectTransactionHistoryRow(transactionHistory) {
    this.selectedTransactionHistory = transactionHistory;
  }

  /**
   * Listens when a new business have been selected
   * @param business  selected business
   */
  onSelectBusinessEvent(business) {
    // console.log('onSelectBusinessEvent => ', business);
    this.transactionHistoryService.selectBusiness(business);
  }

  graphQlAlarmsErrorHandler$(response) {
    return Rx.Observable.of(JSON.parse(JSON.stringify(response))).pipe(
      tap((resp: any) => {
        this.showSnackBarError(resp);
        return resp;
      })
    );
  }

  /**
   * Shows an error snackbar
   * @param response
   */
  showSnackBarError(response) {
    console.log('showSnackBarError => ', response);
    if (response.errors) {
      if (Array.isArray(response.errors)) {
        response.errors.forEach(error => {
          if (Array.isArray(error)) {
            error.forEach(errorDetail => {
              this.showMessageSnackbar("ERRORS." + errorDetail.message.code);
            });
          } else {
            response.errors.forEach(error => {
              this.showMessageSnackbar("ERRORS." + error.message.code);
            });
          }
        });
      }
    }
  }

  /**
   * Shows a message snackbar on the bottom of the page
   * @param messageKey Key of the message to i18n
   * @param detailMessageKey Key of the detail message to i18n
   */
  showMessageSnackbar(messageKey, detailMessageKey?) {
    const translationData = [];
    if (messageKey) {
      translationData.push(messageKey);
    }

    if (detailMessageKey) {
      translationData.push(detailMessageKey);
    }

    this.translate.get(translationData).subscribe(data => {
      this.snackBar.open(
        messageKey ? data[messageKey] : "",
        detailMessageKey ? data[detailMessageKey] : "",
        {
          duration: 2000
        }
      );
    });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
