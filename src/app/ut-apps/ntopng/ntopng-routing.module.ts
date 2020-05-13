import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { NtopngComponent } from './ntopng.component';const routes: Routes = [ { path: '', component: NtopngComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NtopngRoutingModule { }
