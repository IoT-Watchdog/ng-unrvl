import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { InetmapComponent } from './inetmap.component';
const routes: Routes = [{ path: '', component: InetmapComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InetmapRoutingModule {}
