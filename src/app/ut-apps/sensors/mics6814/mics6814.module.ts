import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Mics6814RoutingModule } from './mics6814-routing.module';
import { Mics6814Component } from './mics6814.component';
import { UtDygraphModule } from '../../../shared/ut-dygraph/ut-dygraph.module';

@NgModule({
  imports: [
    CommonModule,
    Mics6814RoutingModule,
    UtDygraphModule
  ],
  declarations: [Mics6814Component]
})
export class Mics6814Module { }
