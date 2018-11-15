import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { TransactionHistoryService } from './transaction-history/transaction-history.service';
import { ManualPocketAdjustmentService } from './manual-pocket-adjustment/manual-pocket-adjustment.service';
import { TransactionHistoryDetailService } from './transaction-history-detail/transaction-history-detail.service';
import { WalletService } from './wallet.service';
import { walletComponent } from './wallet.component';
import { TransactionHistoryComponent } from './transaction-history/transaction-history.component';
import { ManualPocketAdjustmentComponent } from './manual-pocket-adjustment/manual-pocket-adjustment.component';
import { TransactionHistoryDetailComponent } from './transaction-history-detail/transaction-history-detail.component';
import { DialogComponent } from './dialog/dialog.component';
import { CurrencyFormatterDirective } from './directives/currencyFormatter.directive';
import { CurrencyPipe } from './directives/currency.pipe';
import { MatDatepickerModule as MatDatepickerModule1, MatMomentDateModule as  MatMomentDateModule1} from '@coachcare/datepicker';

const routes: Routes = [
  {
    path: 'transaction-history',
    component: TransactionHistoryComponent,
  },
  {
    path: 'transaction-history/:id',
    component: TransactionHistoryDetailComponent,
  },
  {
    path: 'manual-pocket-adjustment',
    component: ManualPocketAdjustmentComponent,
  }
];

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FuseWidgetModule,
    MatDatepickerModule1,
    MatMomentDateModule1,
  ],
  declarations: [
    walletComponent,
    TransactionHistoryComponent,
    TransactionHistoryDetailComponent,
    ManualPocketAdjustmentComponent,
    CurrencyFormatterDirective,
    DialogComponent
  ],
  entryComponents: [DialogComponent],
  providers: [ WalletService, DatePipe, ManualPocketAdjustmentService, TransactionHistoryService, TransactionHistoryDetailService, CurrencyPipe]
})

export class walletModule {}
