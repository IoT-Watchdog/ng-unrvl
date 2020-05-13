import { HttpClientModule } from '@angular/common/http';
import { LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule, Routes } from '@angular/router';

import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';

import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { TopBarComponent } from './top-bar/top-bar.component';
import { environment } from '../environments/environment';

registerLocaleData(localeDe, 'de');

const appRoutes: Routes = [
  {
    path: 'Settings',
    loadChildren: './ut-settings/ut-settings.module#UtSettingsModule'
  },
  {
    path: 'Settings/Services',
    loadChildren: './ut-settings/services/services.module#ServicesModule'
  },
  {
    path: 'Dashboard',
    loadChildren: './ut-dashboard/ut-dashboard.module#UtDashboardModule'
  },
  {
    path: 'Apps/loudness',
    loadChildren: './ut-apps/loudness/loudness.module#LoudnessModule'
  },
  {
    path: 'Apps/ntopng',
    loadChildren: './ut-apps/ntopng/ntopng.module#NtopngModule'
  },
  {
    path: 'Apps/noir',
    loadChildren: './ut-apps/noir/noir.module#NoirModule'
  },
  {
    path: 'Apps/Power',
    loadChildren: './ut-apps/power/power.module#PowerModule'
  },
  {
    path: 'Apps/Temperatures',
    loadChildren:
      './ut-apps/temperatures/temperatures.module#TemperaturesModule'
  },
  {
    path: 'Apps/Dygraph-Playground',
    loadChildren: './ut-apps/dygraph-dev/dygraph-dev.module#DygraphDevModule'
  },
  {
    path: 'Apps/Influx-Test',
    loadChildren: './ut-apps/influx-test/influx-test.module#InfluxTestModule'
  },
  {
    path: 'Apps/MQTT-Test',
    loadChildren: './ut-apps/mqtt/mqtt.module#MqttModule'
  },

  {
    path: 'Apps/System',
    loadChildren: './ut-apps/system/system.module#SystemModule'
  },
  {
    path: '',
    redirectTo: 'Dashboard',
    pathMatch: 'full'
  },
  {
    path: '**',
    loadChildren: './ut-dashboard/ut-dashboard.module#UtDashboardModule'
  }
];

@NgModule({
  declarations: [AppComponent, TopBarComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatIconModule,
    HttpClientModule,
    CoreModule.forRoot(),
    RouterModule.forRoot(
      appRoutes,
      { enableTracing: false } // !environment.production
    )
  ],
  providers: [{ provide: LOCALE_ID, useValue: 'de' }, Title],
  bootstrap: [AppComponent]
})
export class AppModule {}
