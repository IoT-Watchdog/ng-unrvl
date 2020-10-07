import { Component, OnInit } from '@angular/core';
// import * as mysql from 'mysql';
import { GlobalSettingsService } from '../../core/global-settings.service';
import { UtFetchdataService } from '../../shared/ut-fetchdata.service';
import { HelperFunctionsService } from '../../core/helper-functions.service';

@Component({
  selector: 'app-hosts',
  templateUrl: './hosts.component.html',
  styleUrls: ['./hosts.component.css'],
})
export class HostsComponent implements OnInit {
  public API = '';

  public sqlresult: Array<any>;

  public ipNames = {};

  constructor(
    private globalSettings: GlobalSettingsService,
    private utHTTP: UtFetchdataService,
    private h: HelperFunctionsService
  ) {
    this.globalSettings.emitChange({ appName: 'IoT Devices' });
  }

  ngOnInit() {
    // const connection = mysql.createConnection({
    //   host: '192.168.11.163',
    //   user: 'root',
    //   password: 'jKD7ubqVeg',
    //   database: 'ntopng',
    // });

    // connection.connect();

    // connection.query(
    //   'SELECT * FROM `flowsv4` ORDER BY `LAST_SWITCHED` ASC LIMIT 25',
    //   function (error, results, fields) {
    //     if (error) throw error;
    //     console.log('The solution is: ', results[0].solution);
    //   }
    // );

    // connection.end();

    this.API = this.globalSettings.getAPIEndpoint();

    this.utHTTP
      .getHTTPData(this.API + 'sql/my.php')
      .subscribe((data: Object) => this.handleMyQuery(data));
    this.getNameforIP('192.27.2.3');
  }
  handleMyQuery(data: Object) {
    console.log('api retval:', data);
    const newArr = [];
    const dataArr = data['result'];
    for (let i = 0; i < dataArr.length; i++) {
      const row = dataArr[i];
      row['IP_SRC_ADDR_str'] = this.h.intToIPv4(row['IP_SRC_ADDR']);
      row['IP_DST_ADDR_str'] = this.h.intToIPv4(row['IP_DST_ADDR']);
      if (!this.ipNames.hasOwnProperty(row['IP_DST_ADDR_str'])) {
        this.getNameforIP(row['IP_DST_ADDR_str']);
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
    }

    this.sqlresult = data['result'];
  }
  getNameforIP(IP: string) {
    this.utHTTP
      .getHTTPData(this.API + 'system/ip2name.php?ip=' + IP)
      .subscribe((data: Object) => this.handleIPname(data));
  }
  handleIPname(data: Object) {
    if (data.hasOwnProperty('success') && data['success'] == false) {
      console.error('handleIPname error, ret:', data);
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
  }
}
