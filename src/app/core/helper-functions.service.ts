import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { formatDate } from '@angular/common';
import * as FileSaver from 'file-saver';
import { cloneDeep } from 'lodash-es';

@Injectable({
  providedIn: 'root',
})
export class HelperFunctionsService {
  domainAndApp = '';
  domain = '';

  // sorted in order of usage
  colors = {
    blue: ['#0000FF', '#6883FF', '#000055', '#394CFF', '#000094'],
    green: ['#008D0A', '#69F97B', '#002402', '#1EF93A', '#023C0A'],
    brown: ['#FF5B00', '#FFDD73', '#561D0B', '#FF9C06', '#883A06'],
    red: ['#E10000', '#FF7F88', '#520000', '#F81E25', '#990000'],
    navy: ['#0061A6', '#00D9FF', '#001341', '#007CC2', '#002C54'],
    violet: ['#842BFF', '#FFEBFF', '#2B0069', '#C78DFF', '#470994'],
    olive: ['#00805C', '#8CE2CD', '#002913', '#37A389', '#003C24'],
  };
  colorOrder = ['green', 'blue', 'red', 'brown', 'olive', 'navy', 'violet'];
  colorArray = [];

  defaultColorMappings = {};

  avgPresets = [
    { '1m': 60 },
    { '5m': 300 },
    { '15m': 900 },
    { '30m': 1800 },
    { '1h': 3600 },
    { '1d': 86400 },
    { '7d': 604800 },
    { '30d': 2592000 },
  ];
  keys(o) {
    // for use in htmls
    return Object.keys(o);
  }
  vals(o) {
    return Object.values(o);
  }

  constructor(private loc: Location) {
    const url = window.location.href;
    const angularRoute = this.loc.path();
    this.domainAndApp = url.replace(angularRoute, '');
    this.domain = this.domainAndApp
      .replace(/:[0-9]*$/, '')
      .replace(/[?]/, '')
      .replace(/\/$/, '');

    for (let cWeightI = 0; cWeightI < this.colors.blue.length; cWeightI++) {
      for (let cOrderI = 0; cOrderI < this.colorOrder.length; cOrderI++) {
        const colorstr = this.colorOrder[cOrderI];
        this.colorArray.push(this.colors[colorstr][cWeightI]);
      }
    }
    this.defaultColorMappings = {
      // define here to calm down TS
      temperature: 'red',
      humidity: 'blue',
      pressure: 'green',
      particulate_matter: 'brown',
      gas: 'violet',
    };
    // console.log('new Colors:', this.colorArray);
  }
  /**
   * @param labels Array of labels
   * @param searchToColor Object { 'searchstring' : '$color' } - color from h.colors
   */

  getColorsforLabels(
    labels: Array<string>,
    searchToColor = this.defaultColorMappings
  ): Array<string> {
    const newColors = [];
    const colorCounters = {};
    for (let c = 1; c < labels.length; c++) {
      const item = labels[c];
      for (const searchstring in searchToColor) {
        if (searchToColor.hasOwnProperty(searchstring)) {
          if (item.match(searchstring)) {
            const colorset = searchToColor[searchstring];
            const rightColorArray = this.colors[colorset];
            if (!colorCounters.hasOwnProperty(colorset)) {
              colorCounters[colorset] = 0;
              newColors.push(rightColorArray[0]);
            } else {
              const i = (colorCounters[colorset] += 1);
              newColors.push(rightColorArray[i % rightColorArray.length]);
            }
            break;
          }
        }
      }
    }
    return newColors;
  }

  // 'green:#00FF00',
  //   'yellow:#FFFF00',
  //   'orange:#FFA600',
  //   'red:#FF0000',
  //   '(dark)violet:#800080',
  returnColorForPercent(
    percent,
    colorRamp = ['#00FF00', '#FFFF00', '#FFA600', '#FF0000', '#800080']
  ) {
    function colorFromPercent(
      percent: number,
      cfrom: string,
      cto: string
    ): string {
      if (cfrom == cto) {
        return cto;
      }
      const from_int = parseInt(cfrom, 16);
      const to_int = parseInt(cto, 16);
      const range = to_int - from_int;
      const hexstr = Math.floor(from_int + (percent / 100) * range).toString(
        16
      );
      return hexstr.length < 2 ? '0' + hexstr : hexstr;
    }
    const nr_sections = colorRamp.length - 1;
    const section_len_percent = 100 / nr_sections;
    const needed_section =
      percent < 100
        ? Math.floor(percent / section_len_percent)
        : nr_sections - 1;

    if (!colorRamp[needed_section]) {
      console.error(
        'percent',
        percent,
        'nr_sections',
        nr_sections,
        'needed_section',
        needed_section
      );
      return '#FFFFFF';
    }
    const lower_bound = colorRamp[needed_section];
    const upper_bound = colorRamp[needed_section + 1];
    const r_lower = lower_bound.substring(1, 3);
    const g_lower = lower_bound.substring(3, 5);
    const b_lower = lower_bound.substring(5, 7);
    const r_upper = upper_bound.substring(1, 3);
    const g_upper = upper_bound.substring(3, 5);
    const b_upper = upper_bound.substring(5, 7);
    const new_r = colorFromPercent(percent, r_lower, r_upper);
    const new_g = colorFromPercent(percent, g_lower, g_upper);
    const new_b = colorFromPercent(percent, b_lower, b_upper);
    // console.log('percent', percent, 'nr_sections', nr_sections, 'needed_section', needed_section, new_r, new_g, new_b );
    // console.log(percent, 'rgb', new_r, new_g, new_b);

    return '#' + new_r + new_g + new_b;
  }

  getBaseURL() {
    return this.domain;
  }

  getDeep(obj: Object, argumentsArray: Array<any>): any {
    if (!obj) {
      console.error('getDeep: !obj');
      return undefined;
    }
    while (argumentsArray.length) {
      const currentIndex = argumentsArray.shift();
      if (obj.hasOwnProperty(currentIndex)) {
        obj = obj[currentIndex];
      } else {
        return undefined;
      }
    }
    return obj;
  }
  influx2geojsonPoints(data, labels = []): GeoJSON.FeatureCollection<any> {
    let points: GeoJSON.FeatureCollection<any> = {
      type: 'FeatureCollection',
      features: [],
    };
    let latlabelpos: number, lonlabelpos: number;
    if (labels.length > 2) {
      for (let i = 1; i < labels.length; i++) {
        // first: Date
        const element = labels[i];
        if (element.indexOf('location') > -1) {
          if (element.indexOf('lat') > -1) {
            latlabelpos = i;
          } else if (element.indexOf('lon') > -1) {
            lonlabelpos = i;
          }
        }
      }
      if (!latlabelpos || !lonlabelpos) {
        console.error(
          'error in influx2geojsonPoints, lat or lon not found in',
          labels
        );
        return undefined;
      }
    }

    for (let i = 0; i < data.length; i++) {
      const element = data[i];
      let coords = [];
      if (labels.length == 0) {
        coords = [element[2], element[1]];
      } else {
        coords = [element[lonlabelpos], element[latlabelpos]];
      }
      if (!coords[0] || !coords[1]) {
        continue;
      }
      const point: GeoJSON.Feature<any> = {
        type: 'Feature' as const,
        properties: { Date: element[0] },
        geometry: {
          type: 'Point',
          coordinates: coords,
        },
      };
      if (labels.length > 3) {
        for (let i = 1; i < labels.length; i++) {
          const label = labels[i];
          if (i != latlabelpos && i != lonlabelpos) {
            point.properties[label] = element[i];
          }
        }
      }
      points.features.push(point);
    }
    console.log('geojson:', points);

    return points;
  }

  parseToSeconds(inputString: string): number {
    if (
      inputString.endsWith('s') &&
      parseInt(inputString.slice(0, -1), 10) > 0
    ) {
      return parseInt(inputString.slice(0, -1), 10);
    }
    if (
      inputString.endsWith('m') &&
      parseInt(inputString.slice(0, -1), 10) > 0
    ) {
      return parseInt(inputString.slice(0, -1), 10) * 60;
    }
    if (
      inputString.endsWith('h') &&
      parseInt(inputString.slice(0, -1), 10) > 0
    ) {
      return parseInt(inputString.slice(0, -1), 10) * 60 * 60;
    }
    if (
      inputString.endsWith('d') &&
      parseInt(inputString.slice(0, -1), 10) > 0
    ) {
      return parseInt(inputString.slice(0, -1), 10) * 60 * 60 * 24;
    }
    if (
      inputString.endsWith('y') &&
      parseInt(inputString.slice(0, -1), 10) > 0
    ) {
      return parseInt(inputString.slice(0, -1), 10) * 60 * 60 * 24 * 365;
    }
    return undefined;
  }

  // array must be consecutive!
  // returns the two indizes in which between the searched Date is
  binarySearchNearDate(
    inputArray: Array<[Date, any]>,
    target: Date,
    ObjectPath?: String
  ) {
    let lowerIndex = 0,
      upperIndex = inputArray.length - 1;

    function compareDate(date1: Date, date2: Date) {
      if (!date1 || !date2) {
        return undefined;
      }
      if (date1.valueOf() === date2.valueOf()) {
        return 0;
      }
      return date1.valueOf() > date2.valueOf() ? 1 : -1;
    }

    while (lowerIndex + 1 < upperIndex) {
      const halfIndex = (lowerIndex + upperIndex) >> 1; // tslint:disable-line
      const halfElem = inputArray[halfIndex][0];

      const comparisonResult = compareDate(target, halfElem);
      if (comparisonResult === undefined) {
        return [undefined, undefined];
      }
      if (comparisonResult === 0) {
        lowerIndex = halfIndex;
        upperIndex = halfIndex;
        break;
      }
      if (comparisonResult > 0) {
        lowerIndex = halfIndex;
      } else {
        upperIndex = halfIndex;
      }
    }

    return [lowerIndex, upperIndex];
  }

  returnDataRange(indata, from: Date, to: Date) {
    if (!indata.length || !from || !to) {
      console.error('returnDataRange: empty input', indata, from, to);
      return [];
    }

    function isbetweenDate(target: Date, lower: Date, upper: Date) {
      return (
        (lower.valueOf() <= target.valueOf() &&
          upper.valueOf() > target.valueOf()) ||
        upper.valueOf() === target.valueOf()
      );
    }

    console.log('slicing from', from, 'to', to, 'in', indata);
    let startindex;
    if (from.valueOf() <= indata[0][0].valueOf()) {
      startindex = 0;
    }
    let endindex;
    if (to.valueOf() >= indata[indata.length - 1][0].valueOf()) {
      endindex = indata.length - 1;
    }

    for (let i = 0; i < indata.length - 1; i++) {
      const elementDate = indata[i][0];
      const nextElement = indata[i + 1][0];
      if (startindex === undefined) {
        // if(i === 0) {
        //   console.log(elementDate.valueOf(), from.valueOf())
        // }
        if (isbetweenDate(from, elementDate, nextElement)) {
          startindex = i;
          continue;
        }
      }
      if (endindex === undefined) {
        if (isbetweenDate(to, elementDate, nextElement)) {
          endindex = i;
          break;
        }
      }
    }
    if (startindex === undefined) {
      console.error('startindex not found');
      return [];
    }
    if (!endindex) {
      endindex = indata.length;
    }
    const outdata = indata.slice(startindex, endindex + 1);

    console.log('dataslice from', startindex, 'to', endindex);

    return outdata;
  }

  createLabelString(lObj: Object, blackListLabels: string[] = []): string {
    const labelBlackList = cloneDeep(blackListLabels);
    //$sensor@host
    let labelString = '';
    if (lObj['sensor'] && labelBlackList.indexOf('sensor') === -1) {
      labelString = lObj['sensor'];
      labelBlackList.push('sensor');
    }
    if (lObj['model'] && labelBlackList.indexOf('model') === -1) {
      labelString = lObj['model'];
      labelBlackList.push('model');
    }
    if (lObj['node'] && labelBlackList.indexOf('node') === -1) {
      labelString += '@' + lObj['node'];
      labelBlackList.push('node');
    }

    let firstDone = false;
    for (let key in lObj) {
      let value = lObj[key];

      let isInBlackList = false;
      if (labelBlackList) {
        labelBlackList.forEach((item) => {
          if (key == item) {
            isInBlackList = true;
          }
        });
      }
      if (isInBlackList) {
        continue;
      }

      if (key === 'model' && value === 'adc') {
        continue;
      }
      if (key === 'job') {
        continue;
      }
      if (key === 'channel') {
        key = 'ch';
      }
      if (key === 'interval') {
        key = 'i';
      }
      if (value === 'temperature_degC') {
        value = 'T';
      }
      if (value === 'humidity_rel_percent') {
        value = 'rH';
      }

      if (firstDone) {
        labelString += ', ';
      } else {
        if (labelString) {
          labelString += ': ';
        }
        firstDone = true;
      }
      if (key === '__name__') {
        labelString += value;
        continue;
      }
      labelString += key + ': ' + value;
    }
    if (!labelString) {
      labelString = 'average'; // FIXME maybe something else...
    }
    return labelString;
  }

  exportCSV(data, labels, utc = true, missing = true) {
    // header
    const separator = '\t';
    const linebreak = '\n';
    console.log('utc:', utc);

    let header = '';
    if (labels.length === 0 || data.length === 0) {
      alert('no data to export');
      return;
    }
    let step = 1000;
    if (data.length > 1) {
      step = data[1][0].valueOf() - data[0][0].valueOf();
    }
    for (let i = 0; i < labels.length; i++) {
      const element = labels[i];
      if (i > 0) {
        header += separator;
      }
      header += element.replace(/,/g, ';');
      if (i === 0) {
        header +=
          separator +
          'Date (' +
          (utc
            ? 'UTC'
            : new Date()
                .toLocaleTimeString('en-us', { timeZoneName: 'short' })
                .split(' ')[2]) +
          ')';
      }
    }
    header += linebreak;

    let csvbody = '';
    function parseRow(row) {
      let line = '';
      for (let column = 0; column < row.length; column++) {
        const element = row[column];
        if (column === 0) {
          line += String(element.valueOf() / 1000) + separator;
          line += utc ? element.toUTCString() : element.toString();
        } else {
          line += separator + String(element);
        }
      }
      return line + linebreak;
    }
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      csvbody += parseRow(row);

      // gap detection
      if (i > 2 && i < data.length - 1) {
        let currentTS = row[0].valueOf();
        let nextTS = data[i + 1][0].valueOf();
        while (currentTS + step < nextTS) {
          currentTS += step;
          const row = [new Date(currentTS)];
          for (let c = 1; c < labels.length; c++) {
            row.push(null);
          }
          csvbody += parseRow(row);
        }
      }
    }

    const csv = header + csvbody;
    // console.log(csv);

    const blob = new Blob([csv], { type: 'text/csv' });

    const startDate = data[0][0];
    const endDate = data[data.length - 1][0];

    const name =
      formatDate(startDate, 'yyyy-MM-dd_HH.mm.ss', 'en-uk') +
      '-' +
      formatDate(endDate, 'HH.mm.ss', 'en-uk') +
      '.csv';
    FileSaver.saveAs(blob, name);
  }
  exportGeojson(geojsondata) {
    console.log('exporting', geojsondata);

    if (!geojsondata['type']) {
      alert('geojson data not valid');
      return;
    }
    let name = 'date_unknown.geojson';
    if (geojsondata.features && geojsondata.features.length) {
      name =
        formatDate(
          geojsondata.features[0].properties.date,
          'yyyy-MM-dd_HH.mm.ss',
          'en-uk'
        ) +
        '-' +
        formatDate(
          geojsondata.features[geojsondata.features.length - 1].properties.date,
          'yyyy-MM-dd_HH.mm.ss',
          'en-uk'
        ) +
        '.geojson';
    }

    const blob = new Blob([JSON.stringify(geojsondata)], {
      type: 'text/geojson',
    });
    FileSaver.saveAs(blob, name);
  }

  isString(x) {
    return Object.prototype.toString.call(x) === '[object String]';
  }

  relHumidity(argT, argTD) {
    const T = this.isString(argT) ? Number(argT) : argT;

    let a: number, b: number;
    if (T >= 0) {
      a = 7.5;
      b = 237.3;
    } else {
      a = 7.6;
      b = 240.7;
    }

    const SDD = 6.1078 * Math.pow(10, (a * T) / (b + T)); // Sättigungsdampfdruck in hPa
    const SDDDP = 6.1078 * Math.pow(10, (a * argTD) / (b + argTD));
    const rH = (100 * SDDDP) / SDD;
    return rH;
  }
  absHumidity(argT, argRH) {
    const T = this.isString(argT) ? Number(argT) : argT;
    const rH = this.isString(argRH) ? Number(argRH) : argRH;
    // console.log('aH(', T, rH, ')');
    // from https://www.wetterochs.de/wetter/feuchte.html
    const T_K = T + 273.15;
    let a: number, b: number;
    if (T >= 0) {
      a = 7.5;
      b = 237.3;
    } else {
      a = 7.6;
      b = 240.7;
    }
    const m_w = 18.016; // kg/kmol Molekulargewicht des Wasserdampfes
    const R = 8314.3; // J/(kmol*K) (universelle Gaskonstante)

    const SDD = 6.1078 * Math.pow(10, (a * T) / (b + T)); // Sättigungsdampfdruck in hPa
    const DD = (rH / 100) * SDD; // Dampfdruck in hPa
    return 100000 * (m_w / R) * (DD / T_K);

    //=  10^5 * mw/R* * DD(r,T)/TK; AF(TD,TK) = 10^5 * mw/R* * SDD(TD)/TK
    // console.log('result:', aH);
  }
  dewPoint(argT, argRH, P = 972) {
    const T = this.isString(argT) ? Number(argT) : argT;
    const rH = this.isString(argRH) ? Number(argRH) : argRH;

    // source: https://en.wikipedia.org/wiki/Dew_point#Calculating_the_dew_point
    // todo enhance with constants for different temperature sets
    let a: number, b: number, c: number, d: number;
    a = 6.1121; //mbar
    b = 18.678;
    c = 257.14; // °C
    d = 234.5; // °C

    const y_m = Math.log((rH / 100) * Math.exp((b - T / d) * (T / (c + T))));
    return (c * y_m) / (b - y_m);
  }

  private e = Math.exp(1);
  // smooth sensor values at bottom of measurement range
  smoothNO2(value, threshold = 20.0) {
    if (value === null) return NaN;
    if (value > threshold) return value;
    const factor = threshold / this.e;
    return Math.exp(value / threshold) * factor;
  }

  calcHTMLColor(r_lux, g_lux, b_lux) {
    let max = Math.max(r_lux, g_lux, b_lux);
    let r = Math.round((r_lux / max) * 255);
    let g = Math.round((g_lux / max) * 255);
    let b = Math.round((b_lux / max) * 255);
    const r_hex = ('00' + r.toString(16)).substr(-2),
      g_hex = ('00' + g.toString(16)).substr(-2),
      b_hex = ('00' + b.toString(16)).substr(-2);
    const htmlColor = '#' + r_hex + g_hex + b_hex;
    return htmlColor;
  }

  /* series: array [[Date,values...][Date,values...]]
  returns object with array (the same format, len -1 of input) and the averages for each series*/
  calc1stDev(series = []) {
    // change per second
    if (!series.length || series.length < 2) {
      console.error('not enough input for calc1stDev, return');
      return { devs: [], avgs: [], error: true };
    }
    const devs = [];
    const seriesSumDevs = [];
    for (let c = 1; c < series[0].length; c++) {
      seriesSumDevs.push(0);
    }
    for (let i = 1; i < series.length; i++) {
      const thisrow = series[i];
      const lastrow = series[i - 1];
      const deltas = [];
      for (let c = 0; c < thisrow.length; c++) {
        // all time AND value deltas
        if (c === 0) {
          deltas[c] = thisrow[c].valueOf() - lastrow[c].valueOf();
        } else {
          deltas[c] = thisrow[c] - lastrow[c];
        }
      }
      const deltaPerUnit = [thisrow[0]]; // timestamp
      for (let c = 1; c < deltas.length; c++) {
        deltaPerUnit[c] = (deltas[c] / deltas[0]) * 1000; // to make it per second
        seriesSumDevs[c - 1] += deltaPerUnit[c];
      }
      devs.push(deltaPerUnit);
    }
    const avgDevs = [];
    const len = devs.length;
    for (let c = 0; c < seriesSumDevs.length; c++) {
      avgDevs[c] = seriesSumDevs[c] / len;
    }
    return { devs: devs, avgs: avgDevs };
  }

  addNewReceivedSensorToFilter(
    sensor: string,
    receivedSensors: Object,
    sensorPriority: string[]
  ) {
    if (receivedSensors.hasOwnProperty(sensor)) {
      return;
    }
    // if the new sensor is higher priority than others, true and each other false
    let currentHighest;
    for (let [key, value] of Object.entries(receivedSensors)) {
      if (value == true) {
        currentHighest = key;
        break;
      }
    }
    if (!currentHighest) {
      receivedSensors[sensor] = true;
      console.log('initial sensor:', sensor);
      return;
    }
    let currentHighestOrder = 4242;
    let newOrder = 4242;
    for (let i = 0; i < sensorPriority.length; i++) {
      const element = sensorPriority[i];
      if (element === currentHighest) {
        currentHighestOrder = i;
        continue;
      }
      if (element === sensor) {
        newOrder = i;
      }
    } // if not found, it stays the initial value
    if (newOrder < currentHighestOrder) {
      console.log('currentHighest: ', currentHighest);
      receivedSensors[currentHighest] = false;
      receivedSensors[sensor] = true;
      console.log('new better sensor found:', sensor);
    } else {
      console.log('new sensor not better', sensor);
      receivedSensors[sensor] = false;
    }
  }
  getSensorFromTopic(topic: string) {
    const parts = topic.split('/');
    if (parts.length < 2 || parts[1] !== 'sensors') {
      console.error('topic not in /sensors/ - format ');
      return undefined;
    }
    return parts[2];
  }

  createHRTimeString(seconds) {
    // human-readable
    const currentMS = Math.round((seconds % 1) * 1000);
    const textMS = currentMS ? String(currentMS) + 'ms' : '';
    const currentSeconds = Math.floor(seconds);
    const displayedSeconds = currentSeconds % 60;
    const textSeconds = displayedSeconds ? String(displayedSeconds) + 's ' : '';

    const currentMinutes = Math.floor(currentSeconds / 60);
    const displayedMinutes = currentMinutes % 60;
    const textMinutes = displayedMinutes ? String(displayedMinutes) + 'm ' : '';

    const currentHours = Math.floor(currentMinutes / 60);
    const displayedHours = currentHours % 24;
    const textHours = displayedHours ? String(displayedHours) + 'h ' : '';

    const currentDays = Math.floor(currentHours / 24);
    const textDays = currentDays ? String(currentDays) + 'd ' : '';

    return (textDays + textHours + textMinutes + textSeconds + textMS).trim();
  }

  deepCopyInto(firstObj, secondObj) {
    for (const key in secondObj) {
      if (secondObj.hasOwnProperty(key)) {
        const element = secondObj[key];
        if (typeof element !== 'object' || element === null) {
          firstObj[key] = element;
        } else {
          if (!firstObj.hasOwnProperty(key))
            firstObj[key] = { noooooo: 'noooooo' }; // hack to create nonempty obj
          this.deepCopyInto(firstObj[key], element);
          delete firstObj['noooooo'];
        }
      }
    }
  }

  leafletPopup(feature, layer) {
    const timeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    };
    // does this feature have a property named popupContent?
    if (feature.properties) {
      let text = '<table>';
      for (let [key, value] of Object.entries(feature.properties)) {
        const v =
          key == 'Date'
            ? value['toLocaleDateString']('de-DE', timeFormatOptions)
            : Number.isFinite(Number(value))
            ? Math.round(Number(value) * 100) / 100
            : value;
        text += '<tr><th>' + key + ':</th><td>' + v + '</td></tr>';
      }
      text += '</table>';
      layer.bindPopup(text);
    }
  }
  intToIPv4(intip: string) {
    const ip_i = parseInt(intip);
    const hex_str = ip_i.toString(16);
    const a = Math.floor(ip_i / 16777216),
      b = parseInt(hex_str.substr(2, 2), 16),
      c = parseInt(hex_str.substr(4, 2), 16),
      d = parseInt(hex_str.substr(6, 2), 16);
    if (isNaN(a) || isNaN(b) || isNaN(c) || isNaN(d)) {
      // console.error(intip, a, b, c, d);
      return '-';
    }
    return (
      a.toString(10) +
      '.' +
      b.toString(10) +
      '.' +
      c.toString(10) +
      '.' +
      d.toString(10)
    );
  }
  intBtoStrB(intb: number) {
    let prefixes = [' K', ' M', ' G', ' T'];
    let newNr = intb;
    let currentprefix = '';

    while (newNr > 1024) {
      newNr = Math.round((newNr / 1024) * 10) / 10;
      currentprefix = prefixes.shift();
    }
    return newNr.toString(10) + currentprefix;
  }
  numProtoToText(proto: number): string {
    if (proto == 1) return 'icmp';
    if (proto == 2) return 'igmp';
    if (proto == 6) return 'TCP';
    if (proto == 17) return 'UDP';
    return proto.toString(10);
  }
  numL7ProtoToText(proto: number): string {
    // source: http://192.168.0.248:3000/lua/flows_stats.lua - hover over "Application"
    if (proto == 0) return 'unknown';
    if (proto == 1) return 'FTP CONTROL';
    if (proto == 2) return 'POP3';
    if (proto == 3) return 'SMTP';
    if (proto == 4) return 'IMAP';
    if (proto == 5) return 'DNS';
    if (proto == 6) return 'DNS';
    if (proto == 7) return 'HTTP';
    if (proto == 8) return 'MDNS';
    if (proto == 9) return 'NTP';
    if (proto == 10) return 'NetBIOS';
    if (proto == 11) return 'NetBIOS';
    if (proto == 12) return 'SSDP';
    if (proto == 13) return 'BGP';
    if (proto == 14) return 'SNMP';
    if (proto == 15) return 'XDMCP';
    if (proto == 16) return 'SMBv1';
    if (proto == 17) return 'Syslog';
    if (proto == 18) return 'DHCP';
    if (proto == 19) return ' PostgreSQL';
    if (proto == 20) return ' MySQL';
    if (proto == 21) return ' Hotmail';
    if (proto == 22) return 'Direct_Download_Link';
    if (proto == 23) return 'POPS';
    if (proto == 24) return 'AppleJuice';
    if (proto == 25) return 'DirectConnect';
    if (proto == 26) return 'ntop';
    if (proto == 27) return 'COAP';
    if (proto == 28) return 'VMware';
    if (proto == 29) return 'SMTPS';
    if (proto == 30) return 'FacebookZero';
    if (proto == 31) return 'UBNTAC2';
    if (proto == 32) return 'Kontiki';
    if (proto == 33) return 'OpenFT';
    if (proto == 34) return 'FastTrack';
    if (proto == 35) return 'Gnutella';
    if (proto == 36) return 'eDonkey';
    if (proto == 37) return 'BitTorrent';
    if (proto == 38) return 'SkypeCall';
    if (proto == 39) return 'TLS.Signal'; // TLS.signal / DNS.playstore
    if (proto == 40) return 'Memcached';
    if (proto == 41) return 'SMBv23';
    if (proto == 42) return 'Mining';
    if (proto == 43) return 'NestLogSink';
    if (proto == 44) return 'Modbus';
    if (proto == 45) return 'WhatsAppCall';
    if (proto == 46) return 'DataSaver';
    if (proto == 47) return 'Xbox';
    if (proto == 48) return 'QQ';
    if (proto == 49) return 'TikTok';
    if (proto == 50) return 'RTSP';
    if (proto == 51) return 'IMAPS';
    if (proto == 52) return 'IceCast';
    if (proto == 53) return 'CPHA';
    if (proto == 54) return 'PPStream';
    if (proto == 55) return 'Zattoo';
    if (proto == 56) return 'ShoutCast';
    if (proto == 57) return 'Sopcast';
    if (proto == 58) return 'Discord';
    if (proto == 59) return 'TVUplayer';
    if (proto == 60) return 'MongoDB';
    if (proto == 61) return 'QQLive';
    if (proto == 62) return 'Thunder';
    if (proto == 63) return 'Soulseek';
    if (proto == 64) return 'PS_VUE';
    if (proto == 65) return 'IRC';
    if (proto == 66) return 'Ayiya';
    if (proto == 67) return 'Unencrypted_Jabber';
    if (proto == 68) return 'Nats';
    if (proto == 69) return 'AmongUs';
    if (proto == 70) return 'Yahoo';
    if (proto == 71) return 'DisneyPlus';
    if (proto == 72) return 'GooglePlus';
    if (proto == 73) return 'VRRP';
    if (proto == 74) return 'Steam';
    if (proto == 75) return 'HalfLife2';
    if (proto == 76) return 'WorldOfWarcraft';
    if (proto == 77) return 'Telnet';
    if (proto == 78) return 'STUN'; // Session Traversal Utilities for NAT
    if (proto == 79) return 'IPsec';
    if (proto == 80) return 'GRE';
    if (proto == 81) return 'ICMP';
    if (proto == 82) return 'IGMP';
    if (proto == 83) return 'EGP';
    if (proto == 84) return 'SCTP';
    if (proto == 85) return 'OSPF';
    if (proto == 86) return 'IP_in_IP';
    if (proto == 87) return 'RTP';
    if (proto == 88) return 'RDP';
    if (proto == 89) return 'VNC';
    if (proto == 90) return 'Tumblr';
    if (proto == 91) return 'TLS';
    if (proto == 92) return 'SSH';
    if (proto == 93) return 'Usenet';
    if (proto == 94) return 'MGCP';
    if (proto == 95) return 'IAX';
    if (proto == 96) return 'TFTP';
    if (proto == 97) return 'AFP';
    if (proto == 98) return 'Stealthnet';
    if (proto == 99) return 'Aimini';
    if (proto == 100) return 'SIP';
    if (proto == 101) return 'TruPhone';
    if (proto == 102) return 'ICMPv6';
    if (proto == 103) return 'DHCPV6';
    if (proto == 104) return 'Armagetron';
    if (proto == 105) return 'Crossfire';
    if (proto == 106) return 'Dofus';
    if (proto == 107) return 'Fiesta';
    if (proto == 108) return 'Florensia';
    if (proto == 109) return 'Guildwars';
    if (proto == 110) return 'AmazonAlexa';
    if (proto == 111) return 'Kerberos';
    if (proto == 112) return 'LDAP';
    if (proto == 113) return 'MapleStory';
    if (proto == 114) return 'MsSQL-TDS';
    if (proto == 115) return 'PPTP';
    if (proto == 116) return 'Warcraft3';
    if (proto == 117) return 'WorldOfKungFu';
    if (proto == 118) return 'Slack';
    if (proto == 119) return 'DNS.Facebook';
    if (proto == 120) return 'DNS.Twitter';
    if (proto == 121) return 'Dropbox';
    if (proto == 122) return 'GMail';
    if (proto == 123) return 'GoogleMaps';
    if (proto == 125) return 'TLS.skype';
    if (proto == 126) return 'TLS.Google'; // G+, TLS.Google
    if (proto == 127) return 'DCE_RPC';
    if (proto == 128) return 'NetFlow';
    if (proto == 129) return 'sFlow';
    if (proto == 130) return 'HTTP_Connect';
    if (proto == 131) return 'HTTP_Proxy';
    if (proto == 132) return 'Citrix';
    if (proto == 133) return 'NetFlix';
    if (proto == 134) return 'LastFM';
    if (proto == 135) return 'Waze';
    if (proto == 136) return 'YouTubeUpload';
    if (proto == 137) return 'Hulu';
    if (proto == 138) return 'CHECKMK';
    if (proto == 139) return 'AJP';
    if (proto == 140) return 'Apple';
    if (proto == 141) return 'Webex';
    if (proto == 142) return 'TLS.whatsapp';
    if (proto == 143) return 'AppleiCloud';
    if (proto == 144) return 'Viber';
    if (proto == 145) return 'AppleiTunes';
    if (proto == 146) return 'Radius';
    if (proto == 147) return 'WindowsUpdate';
    if (proto == 148) return 'TeamViewer';
    if (proto == 149) return 'Tuenti';
    if (proto == 150) return 'LotusNotes';
    if (proto == 151) return 'SAP';
    if (proto == 152) return 'GTP';
    if (proto == 153) return 'UPnP';
    if (proto == 154) return 'LLMNR';
    if (proto == 155) return 'RemoteScan';
    if (proto == 156) return 'Spotify';
    if (proto == 157) return 'Messenger';
    if (proto == 158) return 'H323';
    if (proto == 159) return 'OpenVPN';
    if (proto == 160) return 'NOE';
    if (proto == 161) return 'CiscoVPN';
    if (proto == 162) return 'TeamSpeak';
    if (proto == 163) return 'Tor';
    if (proto == 164) return 'CiscoSkinny';
    if (proto == 165) return 'RTCP';
    if (proto == 166) return 'RSYNC';
    if (proto == 167) return 'Oracle';
    if (proto == 168) return 'Corba';
    if (proto == 169) return 'UbuntuONE';
    if (proto == 170) return 'Whois-DAS';
    if (proto == 171) return 'Collectd';
    if (proto == 172) return 'SOCKS';
    if (proto == 173) return 'Nintendo';
    if (proto == 174) return 'RTMP';
    if (proto == 175) return 'FTP_DATA';
    if (proto == 176) return 'Wikipedia';
    if (proto == 177) return 'ZeroMQ';
    if (proto == 178) return 'TLS.amazon';
    if (proto == 179) return 'eBay';
    if (proto == 180) return 'CNN';
    if (proto == 181) return 'Megaco';
    if (proto == 182) return 'Redis';
    if (proto == 183) return 'Pinterest';
    if (proto == 184) return 'VHUA';
    if (proto == 185) return 'Telegram';
    if (proto == 186) return 'Vevo';
    if (proto == 187) return 'Pandora';
    if (proto == 188) return 'Quick UDP'; // QUIC
    if (proto == 189) return 'Zoom';
    if (proto == 190) return 'EAQ';
    if (proto == 191) return 'Ookla';
    if (proto == 192) return 'AMQP';
    if (proto == 193) return 'KakaoTalk';
    if (proto == 194) return 'KakaoTalk_Voice';
    if (proto == 195) return 'Twitch';
    if (proto == 196) return 'DNS over TLS'; // via /etc/services
    if (proto == 197) return 'WeChat';
    if (proto == 198) return 'MPEG_TS';
    if (proto == 199) return 'Snapchat';
    if (proto == 200) return 'Sina(Weibo)';
    if (proto == 201) return 'TLS.Github';
    if (proto == 202) return 'IFLIX';
    if (proto == 203) return 'TLS.Github';
    if (proto == 204) return 'BJNP';
    if (proto == 205) return 'Reddit';
    if (proto == 206) return 'WireGuard';
    if (proto == 207) return 'SMPP';
    if (proto == 208) return 'DNScrypt';
    if (proto == 209) return 'TINC';
    if (proto == 210) return 'Deezer';
    if (proto == 211) return 'Instagram';
    if (proto == 212) return 'TLS.microsoft';
    if (proto == 213) return 'Starcraft';
    if (proto == 214) return 'Teredo';
    if (proto == 215) return 'HotspotShield';
    if (proto == 216) return 'IMO';
    if (proto == 217) return 'GoogleDrive';
    if (proto == 218) return 'OCS';
    if (proto == 219) return 'Microsoft365';
    if (proto == 220) return 'TLS.cloudflare';
    if (proto == 221) return 'MS_OneDrive';
    if (proto == 222) return 'MQTT';
    if (proto == 223) return 'RX';
    if (proto == 224) return 'AppleStore';
    if (proto == 225) return 'OpenDNS';
    if (proto == 226) return 'Git';
    if (proto == 227) return 'DRDA';
    if (proto == 228) return 'TLS.playstore'; //  / DNS.playstore
    if (proto == 229) return 'SOMEIP';
    if (proto == 230) return 'FIX';
    if (proto == 231) return 'Playstation';
    if (proto == 232) return 'Pastebin';
    if (proto == 233) return 'LinkedIn';
    if (proto == 234) return 'SoundCloud';
    if (proto == 235) return 'CSGO';
    if (proto == 236) return 'LISP';
    if (proto == 237) return 'Diameter';
    if (proto == 238) return 'ApplePush';
    if (proto == 239) return 'G-DNS';
    if (proto == 240) return 'AmazonVideo';
    if (proto == 241) return 'GoogleDocs';
    if (proto == 242) return 'WhatsAppFiles';
    if (proto == 243) return 'Targus Dataspeed';
    if (proto == 244) return 'DNP3';
    if (proto == 245) return 'IEC60870';
    if (proto == 246) return 'Bloomberg';
    if (proto == 247) return 'CAPWAP Zabbix';
    if (proto == 248) return 'Zabbix';
    if (proto == 249) return 's7comm';
    if (proto == 250) return 'Teams';
    if (proto == 251) return 'WebSocket';
    if (proto == 252) return 'AnyDesk';
    if (proto == 253) return 'SOAP';
    if (proto == 254) return 'AppleSiri';

    return proto.toString(10);
  }
  guessSecurityStatus(port1, port2, protocol) {
    const securePorts = [443, 993, 22, 853];
    const secureProts = ['IMAPS', 'TLS'];
    const port1Int = parseInt(port1);
    const port2Int = parseInt(port2);
    if (
      securePorts.indexOf(port1Int) > -1 ||
      securePorts.indexOf(port2Int) > -1 ||
      secureProts.indexOf(protocol) > -1
    ) {
      return 'S';
    }
    for (let i = 0; i < secureProts.length; i++) {
      if (protocol.search(secureProts[i]) > -1) {
        return 'S';
      }
    }
    const insecurePorts = [80, 21];
    if (
      insecurePorts.indexOf(port1Int) > -1 ||
      insecurePorts.indexOf(port2Int) > -1
    ) {
      return '!';
    }
    return '?';
  }
}
