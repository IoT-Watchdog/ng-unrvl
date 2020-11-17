import { Component, OnInit, OnDestroy } from '@angular/core';
import { GlobalSettingsService } from '../../core/global-settings.service';
import { UtFetchdataService } from '../../shared/ut-fetchdata.service';
import { HelperFunctionsService } from '../../core/helper-functions.service';
import { geoJSON, circleMarker } from 'leaflet';
import { forEach } from 'lodash-es';

@Component({
  selector: 'app-localcons',
  templateUrl: './localcons.component.html',
  styleUrls: ['./localcons.component.css'],
})
export class LocalconsComponent implements OnInit, OnDestroy {
  public API = '';

  public sqlresult: Array<any>;
  public localCons: Array<any> = [];

  public ipNames = { '192.168.3.1': 'Iot-Watchdog Gateway' };
  public ipCons = {}; // IP: { $port: { protocol: "TCP", L7: *, last: , dur:, in:, out: }}
  public ipInfo = { '192.168.3.1': 'Iot-Watchdog Gateway' }; // info provided by ntopng
  public ipLocations = {};

  public openHostNameQueries = 0;

  private coordinateTable = {}; // { $lon: { $lat: [IP1, IP2] } } //lat, lon rounded to 4 digits

  public ownHostName = 'IoT-Watchdog';

  constructor(
    private globalSettings: GlobalSettingsService,
    private utHTTP: UtFetchdataService,
    private h: HelperFunctionsService
  ) {
    this.globalSettings.emitChange({ appName: 'Local Connection List' });
  }

  ngOnInit() {
    this.API = this.globalSettings.getAPIEndpoint();

    this.utHTTP
      .getHTTPData(this.API + 'sql/my.php')
      .subscribe((data: Object) => this.handleMyQuery(data));
    // this.getNameforIP('192.27.2.3');
  }
  ngOnDestroy() {}

  reload() {
    this.sqlresult = [];
    this.localCons = [];
    this.utHTTP
      .getHTTPData(this.API + 'sql/my.php')
      .subscribe((data: Object) => this.handleMyQuery(data));
  }
  handleMyQuery(data: Object) {
    console.log('api retval:', data);
    const newArr = [];
    const dataArr = data['result'];
    const uniqueDataArr = [];
    for (let i = 0; i < dataArr.length; i++) {
      const row = dataArr[i];

      // check for duplicates
      let isDuplicate = false;
      for (let di = 0; di < uniqueDataArr.length; di++) {
        const urow = uniqueDataArr[di];
        if (
          row['IP_SRC_ADDR'] == urow['IP_SRC_ADDR'] &&
          row['IP_DST_ADDR'] == urow['IP_DST_ADDR'] &&
          row['L4_DST_PORT'] == urow['L4_DST_PORT'] &&
          row['PROTOCOL'] == urow['PROTOCOL'] &&
          row['L7_PROTO'] == urow['L7_PROTO']
        ) {
          let inb = parseInt(row['IN_BYTES']);
          inb += parseInt(urow['IN_BYTES']);
          urow['inb_s'] = this.h.intBtoStrB(inb);
          urow['IN_BYTES'] = inb;

          let outb = parseInt(row['OUT_BYTES']);
          outb += parseInt(urow['OUT_BYTES']);
          urow['outb_s'] = this.h.intBtoStrB(outb);
          urow['OUT_BYTES'] = outb;

          // console.log('found duplicate rows', row, urow);

          isDuplicate = true;
          break;
        }
      }
      if (isDuplicate) {
        continue;
      }

      row['IP_SRC_ADDR_str'] = this.h.intToIPv4(row['IP_SRC_ADDR']);
      const src_is_local =
        row['IP_SRC_ADDR_str'].startsWith('192.168.') ||
        row['IP_SRC_ADDR_str'] == '-';
      if (
        !src_is_local &&
        !this.ipNames.hasOwnProperty(row['IP_SRC_ADDR_str'])
      ) {
        this.getNameforIP(row['IP_SRC_ADDR_str']);
        this.ipNames[row['IP_SRC_ADDR_str']] = '...';
      }
      row['IP_DST_ADDR_str'] = this.h.intToIPv4(row['IP_DST_ADDR']);
      const dst_is_local =
        row['IP_DST_ADDR_str'].startsWith('192.168.') ||
        row['IP_DST_ADDR_str'].startsWith('255.') ||
        row['IP_DST_ADDR_str'].startsWith('224.') ||
        row['IP_DST_ADDR_str'] == '-';
      // console.log(row, 'src_is_local',src_is_local, 'dst_is_local', dst_is_local);
      if (row['IP_DST_ADDR_str'] == '255.255.255.255') {
        this.ipNames[row['IP_DST_ADDR_str']] = 'Broadcast';
      } else if (
        !dst_is_local &&
        !this.ipNames.hasOwnProperty(row['IP_DST_ADDR_str'])
      ) {
        this.getNameforIP(row['IP_DST_ADDR_str']);
        this.ipNames[row['IP_DST_ADDR_str']] = '...';
      }

      if (
        !src_is_local &&
        !this.ipLocations.hasOwnProperty(row['IP_SRC_ADDR_str'])
      ) {
        this.getLocationForIP(row['IP_SRC_ADDR_str']);
        this.ipLocations[row['IP_SRC_ADDR_str']] = { wait: true };
      }
      if (
        !dst_is_local &&
        !this.ipLocations.hasOwnProperty(row['IP_DST_ADDR_str'])
      ) {
        this.getLocationForIP(row['IP_DST_ADDR_str']);
        this.ipLocations[row['IP_DST_ADDR_str']] = { wait: true };
      }
      if (!this.ipInfo.hasOwnProperty(row['IP_DST_ADDR_str'])) {
        this.ipInfo[row['IP_DST_ADDR_str']] = row['INFO'];
      }

      const begin = parseInt(row['FIRST_SWITCHED']);
      const end = parseInt(row['LAST_SWITCHED']);
      row['fromdate'] = new Date(begin * 1000);
      row['enddate'] = new Date(end * 1000);
      row['duration'] = end - begin;
      row['inb_s'] = this.h.intBtoStrB(parseInt(row['IN_BYTES']));
      row['outb_s'] = this.h.intBtoStrB(parseInt(row['OUT_BYTES']));
      row['prototext'] = this.h.numProtoToText(parseInt(row['PROTOCOL']));
      row['L7prototext'] = this.h.numL7ProtoToText(parseInt(row['L7_PROTO']));
      row['secIcon'] = this.guessSecIcon(
        row['L4_SRC_PORT'],
        row['L4_DST_PORT'],
        row['L7prototext']
      );
      row['sec'] = this.h.guessSecurityStatus(
        row['L4_SRC_PORT'],
        row['L4_DST_PORT'],
        row['L7prototext']
      );

      const conObj = {
        protocol: row['prototext'],
        L7: row['L7prototext'],
        // in: row['inb_s'], // TODO sum up - how?
        // out: row['outb_s'],
        last: row['enddate'],
        duration: row['duration'],
      };
      const serverIP = src_is_local
        ? row['IP_DST_ADDR_str']
        : row['IP_SRC_ADDR_str'];
      const conPort = src_is_local ? row['L4_DST_PORT'] : row['L4_SRC_PORT'];
      if (!this.ipCons.hasOwnProperty(serverIP)) {
        const con = {};
        con[conPort] = conObj;
        this.ipCons[serverIP] = con;
      } else {
        if (!this.ipCons[serverIP].hasOwnProperty(conPort)) {
          this.ipCons[serverIP][conPort] = conObj;
        } else {
          const presetCon = this.ipCons[serverIP][conPort];
          // already there, update
          if (conObj.last.valueOf() > presetCon.last.valueOf()) {
            presetCon.last = conObj.last;
          }
        }
      }

      uniqueDataArr.push(row);
    }

    this.sqlresult = uniqueDataArr;

    for (let i = 0; i < uniqueDataArr.length; i++) {
      const row = uniqueDataArr[i];
      const src_is_local = row['IP_SRC_ADDR_str'].startsWith('192.168.');
      const dst_is_local = row['IP_DST_ADDR_str'].startsWith('192.168.');
      if (
        (src_is_local && dst_is_local) ||
        row['IP_DST_ADDR_str'].startsWith('255.') ||
        row['IP_DST_ADDR_str'].startsWith('224.')
      ) {
        this.localCons.push(row);
        continue;
      }
    }
    console.log('this.ipCons', this.ipCons);
  }
  getNameforIP(IP: string) {
    this.openHostNameQueries += 1;
    this.utHTTP
      .getHTTPData(this.API + 'system/ip2name.php?ip=' + IP)
      .subscribe((data: Object) => this.handleIPname(data));
  }
  handleIPname(data: Object) {
    if (data.hasOwnProperty('success') && data['success'] == false) {
      console.error('handleIPname error, ret:', data);
      this.openHostNameQueries -= 1;
      return;
    }

    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        if (data[key].search('NXDOMAIN') > -1) {
          this.ipNames[key] = 'unknown';
        } else {
          this.ipNames[key] = data[key].slice(0, -1); // remove last "."
        }
        console.log(key, ':', this.ipNames[key]);
      }
    }
    console.log(this.ipNames);

    this.openHostNameQueries -= 1;
  }

  getLocationForIP(IP: string) {
    this.utHTTP
      .getHTTPData(this.API + 'geoloc/city.php?ip=' + IP)
      .subscribe((data: Object) => this.handleIPLoc(data));
  }
  handleIPLoc(data: Object) {
    if (data.hasOwnProperty('success') && data['success'] == false) {
      console.error('handleIPLoc error, ret:', data);
      return;
    }
    const ip = data['IP'];
    this.ipLocations[ip] = data;
    console.log('new location for', ip, data);
    const str_Lon = (Math.round(data['lon'] * 10000) / 10000).toString();
    const str_Lat = (Math.round(data['lat'] * 10000) / 10000).toString();
    if (
      this.coordinateTable.hasOwnProperty(str_Lon) &&
      this.coordinateTable[str_Lon].hasOwnProperty(str_Lat)
    ) {
      this.coordinateTable[str_Lon][str_Lat].push(ip);
    } else {
      if (this.coordinateTable.hasOwnProperty(str_Lon)) {
        this.coordinateTable[str_Lon][str_Lat] = [ip];
      } else {
        const latO = {};
        latO[str_Lat] = [ip];
        this.coordinateTable[str_Lon] = latO;
      }
    }
  }

  guessSecIcon(port1, port2, con) {
    const sec = this.h.guessSecurityStatus(port1, port2, con);
    const icon =
      sec == 'S'
        ? '<img style="width:16px" src="/assets/lock-fa.png"/>'
        : sec == '!'
        ? '<img style="width:16px" src="/assets/locko-fa.png"/>'
        : '?';
    return icon;
  }
}
