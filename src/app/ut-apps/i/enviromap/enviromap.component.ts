import { Component, OnInit } from '@angular/core';
import { GlobalSettingsService } from '../../../core/global-settings.service';
import { UtFetchdataService } from '../../../shared/ut-fetchdata.service';
import { HelperFunctionsService } from '../../../core/helper-functions.service';
import { geoJSON, circleMarker } from 'leaflet';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-enviromap',
  templateUrl: './enviromap.component.html',
  styleUrls: ['./enviromap.component.scss'],
})
export class EnviromapComponent implements OnInit {
  constructor(
    private globalSettings: GlobalSettingsService,
    private utHTTP: UtFetchdataService,
    public h: HelperFunctionsService,
    private router: ActivatedRoute
  ) {
    this.globalSettings.emitChange({ appName: 'enviromap' });
  }
  colors = [];

  extraDyGraphConfig = {
    connectSeparatedPoints: true,
    pointSize: 3,
    logscale: false,
    series: {
      'pressure sensor: BME280, pressure (hPa)': {
        axis: 'y2',
      },
    },
    y2label: 'Atmospheric Pressure (hPa)',
    axes: {
      y2: {
        independentTicks: true, // default opt here to have a filled object to access later
        // axisLabelWidth: 60, // set on demand
      },
    },
  };
  labelBlackListT = ['host', 'serial', 'mean_*', 'id', 'sensor'];
  graphstyle = {
    position: 'absolute',
    top: '70%',
    bottom: '0.5rem',
    left: '0.5rem',
    right: '0.5rem',
  };
  graphWidth = 1900;
  setGraphWidth(width) {
    this.graphWidth = width;
    console.log('new w', width);
  }

  measurement = 'temperature';
  sensor = '';
  host = '';
  referrer = 'Bimbox001';
  id = '';
  value = '*';

  db = 'bimbox001';
  server = 'https://newton.unraveltec.com';

  labels = [];
  data = [];
  gpsdata = [];
  public displayed_points = {};
  public layers = [];

  public startTime = '2h';
  public userStartTime = this.startTime;
  public meanS = 30;
  public currentres = 0;
  public userMeanS = this.meanS;
  public fromTime: Date;
  public toTime: Date;
  public currentRange: string;
  updateFromToTimes(timearray) {
    // console.log(timearray);
    this.fromTime = new Date(timearray[0]);
    this.toTime = new Date(timearray[1]);
    const rangeSeconds = Math.floor((timearray[1] - timearray[0]) / 1000);
    this.currentRange = this.h.createHRTimeString(rangeSeconds);
    this.userMeanS = this.calcMean(rangeSeconds);
  }

  ngOnInit(): void {
    ['host', 'measurement', 'sensor', 'referrer', 'id', 'value'].forEach(
      (element) => {
        const thing = this.router.snapshot.queryParamMap.get(element);
        if (thing) {
          this[element] = thing;
        }
      }
    );
    this.userMeanS = this.calcMean(this.h.parseToSeconds(this.startTime));
    this.reload();
  }
  reload(fromTo = false) {
    this.meanS = this.userMeanS;
    this.currentres = this.meanS;
    this.startTime = this.userStartTime;

    const timeQuery = fromTo
      ? this.utHTTP.influxTimeString(this.fromTime, this.toTime)
      : this.utHTTP.influxTimeString(this.startTime);

    let params = { sensor: [] };
    if (this.sensor) {
      if (Array.isArray(this.sensor)) {
        params['sensor'] = this.sensor;
      } else {
        params['sensor'] = [this.sensor];
      }
    }
    if (this.host) {
      params['host'] = this.host;
    }
    if (this.id) {
      params['id'] = this.id;
    }

    let queries =
      this.utHTTP.influxMeanQuery(
        this.measurement,
        timeQuery,
        params,
        this.meanS,
        this.value
      ) +
      this.utHTTP.influxMeanQuery(
        'location',
        timeQuery,
        {},
        this.meanS,
        '/lat|lon/'
      );
    // 'SELECT lat,lon FROM location WHERE ' +
    // timeQuery;

    this.launchQuery(queries);
  }

  calcMean(secondsRange) {
    const divider = Math.floor(secondsRange / this.graphWidth);
    return divider > 1 ? divider : 1;
  }
  changeMean(param) {
    const rangeSeconds = this.h.parseToSeconds(param);

    this.userMeanS = this.calcMean(rangeSeconds);

    // this.localStorage.set(this.appName + 'userMeanS', this.userMeanS);
    // this.localStorage.set(this.appName + 'userStartTime', this.userStartTime);
    this.reload();
  }

  launchQuery(clause: string) {
    this.utHTTP
      .getHTTPData(this.utHTTP.buildInfluxQuery(clause))
      .subscribe((data: Object) => this.handleData(data));
  }
  saveMean(param) {
    // this.localStorage.set(this.appName + 'userMeanS', this.userMeanS);
  }

  handleData(data: Object) {
    console.log('received', data);
    let ret = this.utHTTP.parseInfluxData(data, this.labelBlackListT);
    console.log('parsed', ret);
    const labels = ret['labels'];
    const idata = ret['data'];

    let logscale = true;
    const newColors = this.h.getColorsforLabels(labels);
    for (let c = 1; c < labels.length; c++) {
      const item = labels[c];

      if (logscale == true) {
        for (let r = 0; r < idata.length; r++) {
          const point = idata[r][c];
          if (point <= 0 && point !== NaN && point !== null) {
            logscale = false;
            console.log('found', idata[r][c], '@r', r, 'c', c, 'of', item);
            break;
          }
        }
      }
      // NO2: ppm -> ppb
      if (item.match(/NO₂ \(ppm\)/)) {
        labels[c] = item.replace(/ppm/, 'ppb');
        for (let r = 0; r < idata.length; r++) {
          idata[r][c] *= 1000;
        }
      }
      if (item.match(/pressure/)) {
        this.extraDyGraphConfig.axes.y2['axisLabelWidth'] = 60;
      }
    }
    // console.log(cloneDeep(this.dygLabels));
    if (logscale) {
      console.log('scale: log');
      this.extraDyGraphConfig.logscale = logscale;
    } else {
      console.log('scale: lin');
    }
    this.startTime = this.userStartTime;

    const geojsonMarkerOptions = {
      radius: 3,
      fillColor: '#0000ff80',
      color: '#0000ff',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8,
    };

    const graphlabels = [];
    const maplabels = ['Date', 'location lat', 'location lat'];
    const graphdata = [];
    const mapdata = [];
    let latlabelpos: number, lonlabelpos: number;
    for (let i = 0; i < labels.length; i++) {
      const element = labels[i];
      if (element == 'location lat') {
        latlabelpos = i;
      } else if (element == 'location lon') {
        lonlabelpos = i;
      } else {
        graphlabels.push(element);
      }
    }
    for (let r = 0; r < idata.length; r++) {
      const row = idata[r];
      let newgrow = [row[0]];
      let newmrow = [row[0]];
      for (let c = 1; c < row.length; c++) {
        if (c == latlabelpos) {
          newmrow[1] = row[c];
        } else if (c == lonlabelpos) {
          newmrow[2] = row[c];
        } else {
          newgrow.push(row[c]);
        }
      }
      graphdata.push(newgrow);
      mapdata.push(newmrow);
    }
    this.layers[0] = geoJSON(this.h.influx2geojsonPoints(idata, labels), {
      pointToLayer: function (feature, latlng) {
        return circleMarker(latlng, geojsonMarkerOptions);
      },
      onEachFeature: this.h.leafletPopup,
    });

    this.labels = graphlabels;
    this.data = graphdata;
    this.colors = newColors;
    console.log(labels);
    console.log(idata);
  }
}
