import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HostsRoutingModule } from './hosts-routing.module';
import { HostsComponent } from './hosts.component';
import { MapModule } from '../../shared/map/map.module';

@NgModule({
  imports: [
    CommonModule,
    MapModule,
    HostsRoutingModule
  ],
  declarations: [HostsComponent]
})
export class HostsModule { }
