import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LocalconsComponent } from './localcons.component';
const routes: Routes = [{ path: '', component: LocalconsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LocalconsRoutingModule {}
