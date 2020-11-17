import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LocalconsRoutingModule } from './localcons-routing.module';
import { LocalconsComponent } from './localcons.component';
import { MapModule } from '../../shared/map/map.module';
import { FormsModule } from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    MapModule,
    FormsModule,
    LocalconsRoutingModule
  ],
  declarations: [LocalconsComponent]
})
export class LocalconsModule { }
