import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { UtSettingsRoutingModule } from './ut-settings-routing.module';
import { SettingsPanelComponent } from './settings-panel/settings-panel.component';
import { DisplayBrighnessComponent } from './pieces/display-brighness/display-brighness.component';
import {MatSliderModule} from '@angular/material/slider';

@NgModule({
  imports: [
    CommonModule,
    UtSettingsRoutingModule,
    FormsModule,
    MatSliderModule
  ],
  declarations: [SettingsPanelComponent, DisplayBrighnessComponent]
})
export class UtSettingsModule { }
