import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { WalletService } from './wallet-spending-rules.service';
import { WalletComponent } from './wallet-spending-rules.component';
import { SpendingRuleComponent } from './spending-rule/spending-rule.component';

const routes: Routes = [
  {
    path: '',
    component: WalletComponent
  },
  {
    path: 'edit/:buId',
    component: SpendingRuleComponent
  }
];

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FuseWidgetModule
  ],
  declarations: [
    WalletComponent, SpendingRuleComponent
  ],
  providers: [ WalletService, DatePipe]
})

export class WalletSpengingRulesModule {}
