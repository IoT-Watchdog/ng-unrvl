import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InetmapRoutingModule } from './inetmap-routing.module';
import { InetmapComponent } from './inetmap.component';
import { MapModule } from '../../shared/map/map.module';
import { FormsModule } from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    MapModule,
    FormsModule,
    InetmapRoutingModule
  ],
  declarations: [InetmapComponent]
})
export class InetmapModule { }
