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
  startWith
} from "rxjs/operators";
import { Subject } from "rxjs";

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
import { Observable } from "apollo-link";

@Component({
  selector: "app-transaction-history",
  templateUrl: "./transaction-history.component.html",
  styleUrls: ["./transaction-history.component.scss"],
  animations: fuseAnimations
})
export class TransactionHistoryComponent implements OnInit, OnDestroy {
  private ngUnsubscribe = new Subject();

  filterForm: FormGroup;
  // Table data
  dataSource = new MatTableDataSource();
  // Columns to show in the table
  displayedColumns = [
    "timestamp",
    "transactionType",
    "transactionConcept",
    "value",
    "pocket",
    "user",
    "terminalUser"
  ];

  transactionTypes: any = [];
  transactionConcepts: any = [];


  myBusiness: any = null;
  allBusiness: any = [];
  selectedBusinessData: any = null;
  isSystemAdmin: Boolean = false;

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
    private transactionHistoryService: TransactionHistoryService
  ) {
    this.translationLoader.loadTranslations(english, spanish);
  }

  ngOnInit() {
    this.buildFilterForm();
    this.loadRoleData();
    this.loadBusinessData();
    this.refreshTransactionHistoryTable();
  }

  buildFilterForm() {
    // Reactive Form
    this.filterForm = this.formBuilder.group({
      initDate: [""],
      endDate: [""],
      terminalId: [""],
      terminalUserId: [""],
      terminalUsername: [""],
      transactionType: [""],
      transactionConcept: [""]
    });
  }

  /**
   * Paginator of the table
   */
  getPaginator$() {
    return this.paginator.page.pipe(startWith({ pageIndex: 0, pageSize: 10 }));
  }

  refreshTransactionHistoryTable() {
    Rx.Observable.combineLatest(
      this.getPaginator$(),
      this.transactionHistoryService.selectedBusinessEvent$
    )
      .pipe(
        mergeMap(([paginator, selectedBusiness]) => {
          return this.transactionHistoryService.getTransactionHistory$(
            paginator.pageIndex,
            paginator.pageSize,
            selectedBusiness._id
          );
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(([businessData, settlements, selectedBusiness]) => {
        this.isSystemAdmin = businessData[0];
        this.myBusiness = businessData[1];
        this.allBusiness = businessData[2];
        this.selectedBusinessData = selectedBusiness;

        this.dataSource.data = settlements;

        if (!this.isSystemAdmin) {
          this.displayedColumns = [
            "timestamp",
            "from",
            "to",
            "amount",
            "state"
          ];
        } else {
          this.displayedColumns = [
            "timestamp",
            "from",
            "to",
            "amount",
            "fromBusinessState",
            "toBusinessState"
          ];
        }
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

  // /**
  //  * Loads business data
  //  */
  // loadBusinessData$() {
  //   return this.checkIfUserIsAdmin$()
  //   .pipe(
  //     mergeMap(hasSysAdminRole => {
  //       return Rx.Observable.forkJoin(
  //         Rx.Observable.of(hasSysAdminRole),
  //         this.getBusiness$(),
  //         hasSysAdminRole ? this.getAllBusiness$() : Rx.Observable.of([])
  //       );
  //     })
  //   );
  // }

  /**
   * Loads business data
   */
  loadBusinessData() {
    return this.checkIfUserIsAdmin$()
      .pipe(
        mergeMap(hasSysAdminRole => {
          return Rx.Observable.forkJoin(
            Observable.of(hasSysAdminRole),
            this.getBusiness$(),
            hasSysAdminRole ? this.getAllBusiness$() : Rx.Observable.of([])
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
   * Listens when a new business have been selected
   * @param business  selected business
   */
  onSelectBusinessEvent(business) {
    this.transactionHistoryService.selectBusiness(business);
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
