import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { TransactionHistoryService } from './transaction-history/transaction-history.service';
import { ManualPocketAdjustmentService } from './manual-pocket-adjustment/manual-pocket-adjustment.service';
import { WalletService } from './wallet.service';
import { walletComponent } from './wallet.component';
import { TransactionHistoryComponent } from './transaction-history/transaction-history.component';
import { ManualPocketAdjustmentComponent } from './manual-pocket-adjustment/manual-pocket-adjustment.component';

const routes: Routes = [
  {
    path: 'transaction-history',
    component: TransactionHistoryComponent,
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
    FuseWidgetModule
  ],
  declarations: [
    walletComponent,
    TransactionHistoryComponent,
    ManualPocketAdjustmentComponent    
  ],
  providers: [ WalletService, DatePipe, ManualPocketAdjustmentService, TransactionHistoryService]
})

export class walletModule {}