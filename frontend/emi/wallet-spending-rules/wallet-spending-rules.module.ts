import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { WalletComponent } from './wallet-spending-rules.component';
import { SpendingRuleComponent } from './spending-rule/spending-rule.component';
import { WalletSpendingRuleService } from './wallet-spending-rules.service';

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
  providers: [ WalletSpendingRuleService, DatePipe]
})

export class WalletSpengingRulesModule {}
