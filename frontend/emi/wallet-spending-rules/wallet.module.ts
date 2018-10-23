import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { walletService } from './wallet.service';
import { walletComponent } from './wallet.component';

const routes: Routes = [
  {
    path: '',
    component: walletComponent,
  }
];

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FuseWidgetModule
  ],
  declarations: [
    walletComponent    
  ],
  providers: [ walletService, DatePipe]
})

export class walletModule {}