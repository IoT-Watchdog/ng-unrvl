import { Component, OnInit } from '@angular/core';
import { GlobalSettingsService } from '../../core/global-settings.service';
import { UtFetchdataService } from '../../shared/ut-fetchdata.service';
import { HelperFunctionsService } from '../../core/helper-functions.service';
import { geoJSON, circleMarker } from 'leaflet';
import { forEach } from 'lodash-es';

@Component({
  selector: 'app-hosts',
  templateUrl: './hosts.component.html',
  styleUrls: ['./hosts.component.css'],
})
export class HostsComponent implements OnInit {
  public API = '';

  public sqlresult: Array<any>;
  public inetCons: Array<any> = [];
  public localCons: Array<any> = [];

  public ipNames = { '192.168.3.1': 'Iot-Watchdog Gateway' };
  public ipCons = {}; // IP: { $port: { protocol: "TCP", L7: *, last: , dur:, in:, out: }}
  public ipLocations = {};

  private openHostNameQueries = 0;

  public layers = [];
  private geoJsonPoints: GeoJSON.FeatureCollection<any> = {
    type: 'FeatureCollection',
    features: [],
  };
  private geoJsonLines: GeoJSON.FeatureCollection<any> = {
    type: 'FeatureCollection',
    features: [],
  };

  public geolocationPosition: Object;
  public ownLat = 47.07;
  public ownLon = 15.43;
  public ownCity = 'Graz';
  private coordinateTable = {}; // { $lon: { $lat: [IP1, IP2] } } //lat, lon rounded to 4 digits

  public geojsonMarkerOptions = {
    radius: 6,
    color: '#0000ff',
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8,
  };
  public geojsonMarkerOptionsHome = {
    radius: 6,
    color: '#00ff00',
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8,
  };
  public ownHostName = 'IoT-Watchdog';

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
            properties: { Host: this.ownHostName },
            geometry: {
              type: 'Point',
              coordinates: [
                position.coords.longitude,
                position.coords.latitude,
              ],
            },
          };
          this.ownLat = position.coords.latitude;
          this.ownLon = position.coords.longitude;
          this.geoJsonPoints.features.push(point);
          this.updateMap();
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
    this.localCons = [];
    this.inetCons = [];
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
      const dst_is_local =
        row['IP_DST_ADDR_str'].startsWith('192.168.') ||
        row['IP_DST_ADDR_str'].startsWith('255.') ||
        row['IP_DST_ADDR_str'].startsWith('224.');
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
      this.inetCons.push(row);
    }
    console.log('this.ipCons', this.ipCons);
    this.updateLines();
    this.updateMap();
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
      if (this.openHostNameQueries == 1) {
        this.updateLines();
        this.updateMap();
      }
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
    if (this.openHostNameQueries == 1) {
      this.updateLines();
      this.updateMap();
    }
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
    this.geoJsonPoints.features.push(point);

    console.log(this.geolocationPosition);

    console.log(this.layers);

    this.updateLines();
    this.updateMap();
  }
  updateLines() {
    const newGeoJsonLines: GeoJSON.FeatureCollection<any> = {
      type: 'FeatureCollection',
      features: [],
    };
    for (let i = 1; i < this.geoJsonPoints.features.length; i++) {
      // 0 is Iot-Watchdog
      const element = this.geoJsonPoints.features[i];

      const coordinates = [[this.ownLon, this.ownLat]];

      // if coordinates are used more than once, draw additional lines...
      const lon = element.geometry.coordinates[0];
      const lonStr = (Math.round(lon * 10000) / 10000).toString();
      const lat = element.geometry.coordinates[1];
      const latStr = (Math.round(lat * 10000) / 10000).toString();
      if (
        this.coordinateTable.hasOwnProperty(lonStr) &&
        this.coordinateTable[lonStr].hasOwnProperty(latStr) &&
        this.coordinateTable[lonStr][latStr].length > 0
      ) {
        console.log(
          'more than 0 server @ location',
          lonStr,
          latStr,
          this.coordinateTable[lonStr][latStr]
        );
        // second connection to same location
        // insert intermediate coordinates
        let connection_nr = 0
        for (let i = 0; i < this.coordinateTable[lonStr][latStr].length; i++) {
          const server = this.coordinateTable[lonStr][latStr][i];
          if (server == element.properties['IP']) {
            connection_nr = i;
            break;
          }
        }

        const d_lon = this.ownLon - lon,
          d_lat = this.ownLat - lat;
        const distance = Math.sqrt(d_lon * d_lon + d_lat * d_lat);
        const offset = distance / 10 * connection_nr;
        const angle = Math.atan(d_lat / d_lon);
        const y_offset = offset * Math.cos(angle);
        const x_offset = Math.abs(offset * Math.sin(angle));
        const intermediatePoint = [
          (this.ownLon + lon) / 2 + x_offset,
          (this.ownLat + lat) / 2 + y_offset,
        ];
        coordinates.push(intermediatePoint);
      }
      coordinates.push([lon, lat]);
      const linestring: GeoJSON.Feature<any> = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coordinates,
        },
      };
      linestring.properties = element.properties;
      newGeoJsonLines.features.push(linestring);
    }
    this.geoJsonLines = newGeoJsonLines;
  }
  updateMap() {
    for (let i = 0; i < this.geoJsonPoints.features.length; i++) {
      const element = this.geoJsonPoints.features[i];
      if (element.properties.hasOwnProperty('IP')) {
        const ip = element.properties['IP'];
        if (this.ipNames[ip]) {
          element.properties['Hostname'] = this.ipNames[ip];
        }
        if (this.ipCons[ip]) {
          for (const port in this.ipCons[ip]) {
            if (Object.prototype.hasOwnProperty.call(this.ipCons[ip], port)) {
              const con = this.ipCons[ip][port];
              element.properties['Port ' + port + '/' + con.protocol] = con.L7;
            }
          }
        }
      }
    }

    const geojsonMarkerOptions = this.geojsonMarkerOptions;
    const geojsonMarkerOptionsHome = this.geojsonMarkerOptionsHome;
    const layer = geoJSON(this.geoJsonPoints, {
      pointToLayer: function (feature, latlng) {
        if (feature['properties']['Host'] == 'IoT-Watchdog') {
          return circleMarker(latlng, geojsonMarkerOptionsHome);
        } else {
          return circleMarker(latlng, geojsonMarkerOptions);
        }
      },
      onEachFeature: this.h.leafletPopup,
    });
    this.layers[0] = layer;

    const linelayer = geoJSON(this.geoJsonLines, {
      onEachFeature: this.h.leafletPopup,
    });
    this.layers[1] = linelayer;
  }
  locSearch() {
    this.utHTTP
      .getHTTPData(
        'https://nominatim.openstreetmap.org/search?q=' +
          this.ownCity +
          '&format=geojson'
      )
      .subscribe((data: Object) => this.handleNominatimResult(data));
  }
  handleNominatimResult(data: Object) {
    console.log(data);
    if (data.hasOwnProperty('type') && data['type'] == 'FeatureCollection') {
      if (data['features'].length > 0) {
        const firstfeature = data['features'][0];
        if (firstfeature['geometry']['type'] == 'Point') {
          this.ownLon = firstfeature['geometry']['coordinates'][0];
          this.ownLat = firstfeature['geometry']['coordinates'][1];
          this.geoJsonPoints.features[0]['geometry']['coordinates'] =
            firstfeature['geometry']['coordinates'];

          this.updateLines();
          this.updateMap();
        } else {
          console.error('no know geometry type');
        }
      } else {
        alert('Error, no results for Location found');
        return;
      }
    }
  }
}
