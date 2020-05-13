import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NtopngRoutingModule } from './ntopng-routing.module';
import { NtopngComponent } from './ntopng.component';


@NgModule({
  declarations: [NtopngComponent],
  imports: [
    CommonModule,
    NtopngRoutingModule
  ]
})
export class NtopngModule { }
