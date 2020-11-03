import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HostsRoutingModule } from './hosts-routing.module';
import { HostsComponent } from './hosts.component';
import { MapModule } from '../../shared/map/map.module';
import { FormsModule } from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    MapModule,
    FormsModule,
    HostsRoutingModule
  ],
  declarations: [HostsComponent]
})
export class HostsModule { }
