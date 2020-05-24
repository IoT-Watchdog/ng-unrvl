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
    loadChildren: () => import('./ut-settings/ut-settings.module').then(m => m.UtSettingsModule)
  },
  {
    path: 'Settings/Services',
    loadChildren: () => import('./ut-settings/services/services.module').then(m => m.ServicesModule)
  },
  {
    path: 'Dashboard',
    loadChildren: () => import('./ut-dashboard/ut-dashboard.module').then(m => m.UtDashboardModule)
  },
  {
    path: 'Apps/loudness',
    loadChildren: () => import('./ut-apps/loudness/loudness.module').then(m => m.LoudnessModule)
  },
  {
    path: 'Apps/ntopng',
    loadChildren: () => import('./ut-apps/ntopng/ntopng.module').then(m => m.NtopngModule)
  },
  {
    path: 'Apps/noir',
    loadChildren: () => import('./ut-apps/noir/noir.module').then(m => m.NoirModule)
  },
  {
    path: 'Apps/Power',
    loadChildren: () => import('./ut-apps/power/power.module').then(m => m.PowerModule)
  },
  {
    path: 'Apps/Temperatures',
    loadChildren:
      () => import('./ut-apps/temperatures/temperatures.module').then(m => m.TemperaturesModule)
  },
  {
    path: 'Apps/Dygraph-Playground',
    loadChildren: () => import('./ut-apps/dygraph-dev/dygraph-dev.module').then(m => m.DygraphDevModule)
  },
  {
    path: 'Apps/Influx-Test',
    loadChildren: () => import('./ut-apps/influx-test/influx-test.module').then(m => m.InfluxTestModule)
  },
  {
    path: 'Apps/MQTT-Test',
    loadChildren: () => import('./ut-apps/mqtt/mqtt.module').then(m => m.MqttModule)
  },

  {
    path: 'Apps/System',
    loadChildren: () => import('./ut-apps/system/system.module').then(m => m.SystemModule)
  },
  {
    path: '',
    redirectTo: 'Dashboard',
    pathMatch: 'full'
  },
  {
    path: '**',
    loadChildren: () => import('./ut-dashboard/ut-dashboard.module').then(m => m.UtDashboardModule)
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
