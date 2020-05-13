import { Component, OnInit } from '@angular/core';
import { GlobalSettingsService } from 'app/core/global-settings.service';

@Component({
  selector: 'app-ntopng',
  templateUrl: './ntopng.component.html',
  styleUrls: ['./ntopng.component.scss'],
})
export class NtopngComponent implements OnInit {
  constructor(private globalSettings: GlobalSettingsService) {
    this.globalSettings.emitChange({ appName: 'ntopng' });
  }

  ngOnInit() {}
}
