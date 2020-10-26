import { Component, OnInit } from '@angular/core';
// import * as mysql from 'mysql';
import { GlobalSettingsService } from '../../core/global-settings.service';
import { UtFetchdataService } from '../../shared/ut-fetchdata.service';
import { HelperFunctionsService } from '../../core/helper-functions.service';
import { geoJSON, circleMarker } from 'leaflet';

@Component({
  selector: 'app-hosts',
  templateUrl: './hosts.component.html',
  styleUrls: ['./hosts.component.css'],
})
export class HostsComponent implements OnInit {
  public API = '';

  public sqlresult: Array<any>;

  public ipNames = { '192.168.3.1': 'Iot-Watchdog Gateway' };
  public ipLocations = {};

  public layers = [];
  private geoJsonFC: GeoJSON.FeatureCollection<any> = {
    type: 'FeatureCollection',
    features: [],
  };
  private geoJsonLines: GeoJSON.FeatureCollection<any> = {
    type: 'FeatureCollection',
    features: [],
  };

  public geolocationPosition: Object;

  public geojsonMarkerOptions = {
    radius: 6,
    // fillColor: '#0000ff80',
    color: '#0000ff',
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8,
  };

  constructor(
    private globalSettings: GlobalSettingsService,
    private utHTTP: UtFetchdataService,
    private h: HelperFunctionsService
  ) {
    this.globalSettings.emitChange({ appName: 'IoT Devices' });
  }

  ngOnInit() {
    if (window.navigator.geolocation) {
      window.navigator.geolocation.getCurrentPosition(
        (position) => {
          (this.geolocationPosition = position), console.log(position);
          const point: GeoJSON.Feature<any> = {
            type: 'Feature' as const,
            properties: { Host: 'IoT-Watchdog' },
            geometry: {
              type: 'Point',
              coordinates: [
                position.coords.longitude,
                position.coords.latitude,
              ],
            },
          };
          this.geoJsonFC.features.push(point);
          const geojsonMarkerOptions = this.geojsonMarkerOptions;
          const layer = geoJSON(this.geoJsonFC, {
            pointToLayer: function (feature, latlng) {
              return circleMarker(latlng, geojsonMarkerOptions);
            },
            onEachFeature: this.h.leafletPopup,
          });
          this.layers[0] = layer;
        },
        (error) => {
          switch (error.code) {
            case 1:
              console.log('Permission Denied');
              break;
            case 2:
              console.log('Position Unavailable');
              break;
            case 3:
              console.log('Timeout');
              break;
          }
        }
      );
    }

    this.API = this.globalSettings.getAPIEndpoint();

    this.utHTTP
      .getHTTPData(this.API + 'sql/my.php')
      .subscribe((data: Object) => this.handleMyQuery(data));
    // this.getNameforIP('192.27.2.3');
  }
  reload() {
    this.sqlresult = [];
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
      const src_is_local = row['IP_SRC_ADDR_str'].startsWith('192.168.');
      if (
        !src_is_local &&
        !this.ipNames.hasOwnProperty(row['IP_SRC_ADDR_str'])
      ) {
        this.getNameforIP(row['IP_SRC_ADDR_str']);
        this.ipNames[row['IP_SRC_ADDR_str']] = '...';
      }
      row['IP_DST_ADDR_str'] = this.h.intToIPv4(row['IP_DST_ADDR']);
      const dst_is_local = row['IP_DST_ADDR_str'].startsWith('192.168.');
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

      const begin = parseInt(row['FIRST_SWITCHED']);
      const end = parseInt(row['LAST_SWITCHED']);
      row['fromdate'] = new Date(begin * 1000);
      row['enddate'] = new Date(end * 1000);
      row['duration'] = end - begin;
      row['inb_s'] = this.h.intBtoStrB(parseInt(row['IN_BYTES']));
      row['outb_s'] = this.h.intBtoStrB(parseInt(row['OUT_BYTES']));
      row['prototext'] = this.h.numProtoToText(parseInt(row['PROTOCOL']));
      row['L7prototext'] = this.h.numL7ProtoToText(parseInt(row['L7_PROTO']));
      uniqueDataArr.push(row);
    }

    this.sqlresult = uniqueDataArr;
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

    const point: GeoJSON.Feature<any> = {
      type: 'Feature' as const,
      properties: { IP: ip },
      geometry: {
        type: 'Point',
        coordinates: [data['lon'], data['lat']],
      },
    };
    if (data.hasOwnProperty('country') && data['country']) {
      point.properties['Country'] = data['country'];
    }
    if (data.hasOwnProperty('city') && data['city']) {
      point.properties['City'] = data['city'];
    }
    if (data.hasOwnProperty('state') && data['state']) {
      point.properties['State'] = data['state'];
    }
    if (this.ipNames[ip]) {
      point.properties['Hostname'] = this.ipNames[ip];
    }
    this.geoJsonFC.features.push(point);

    console.log(this.geolocationPosition);

    if (this.geolocationPosition && this.geolocationPosition['coords']) {
      const linestring: GeoJSON.Feature<any> = {
        type: 'Feature' as const,
        properties: { IP: ip },
        geometry: {
          type: 'LineString',
          coordinates: [
            [
              this.geolocationPosition['coords']['longitude'],
              this.geolocationPosition['coords']['latitude'],
            ],
            [data['lon'], data['lat']],
          ],
        },
      };
      if (this.ipNames[ip]) {
        linestring.properties['Hostname'] = this.ipNames[ip];
      }
      this.geoJsonLines.features.push(linestring);
    }

    console.log(this.layers);

    const geojsonMarkerOptions = this.geojsonMarkerOptions;
    const layer = geoJSON(this.geoJsonFC, {
      pointToLayer: function (feature, latlng) {
        return circleMarker(latlng, geojsonMarkerOptions);
      },
      onEachFeature: this.h.leafletPopup,
    });
    this.layers[0] = layer;

    const linelayer = geoJSON(this.geoJsonLines, {
      onEachFeature: this.h.leafletPopup,
    });
    this.layers[1] = linelayer;
  }
}
