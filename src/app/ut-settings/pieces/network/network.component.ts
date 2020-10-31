import { Component, OnInit } from '@angular/core';
import { GlobalSettingsService } from '../../../core/global-settings.service';
import { UtFetchdataService } from '../../../shared/ut-fetchdata.service';

@Component({
  selector: 'app-network',
  templateUrl: './network.component.html',
  styleUrls: ['./network.component.scss'],
})
export class NetworkComponent implements OnInit {
  public ssid = '...';
  public psk = '???';

  constructor(
    public gss: GlobalSettingsService,
    private utHTTP: UtFetchdataService
  ) {}

  ngOnInit() {
    this.utHTTP
      .getHTTPData(
        this.gss.getAPIEndpoint() + 'system/nmcli.php?cmd=show&con=Accesspoint'
      )
      .subscribe((data: Object) => this.acceptHotspot(data));
  }
  acceptHotspot(data: Object) {
    if (!data || !data['success']) {
      console.error('acceptHotspot invalid data', data);
      return;
    }
    console.log('acceptHotspot:', data);

    if (data['ssid']) {
      this.ssid = data['ssid'];
    }
    if (data['pass']) {
      this.psk = data['pass'];
    }
  }
  save() {
    this.utHTTP
      .getHTTPData(
        this.gss.getAPIEndpoint() +
          'system/nmcli.php?cmd=modify&con=Accesspoint&ssid=' +
          this.ssid +
          '&pass=' +
          this.psk
      )
      .subscribe((data: Object) => this.handleSave(data));
  }
  handleSave(data: Object) {
    if (!data || !data['success']) {
      alert('acceptHotspot invalid data');
      console.error('acceptHotspot invalid data', data);
      return;
    }
    alert('Hotspot settings changed successfully.');
  }
}
