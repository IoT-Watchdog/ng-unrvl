import { Component, OnInit, Input } from '@angular/core';
import { MqttService } from '../../../core/mqtt.service';

import { Subscription } from 'rxjs';
import cloneDeep from 'lodash-es/cloneDeep';

@Component({
  selector: 'app-tile-load',
  templateUrl: './tile-load.component.html',
  styleUrls: ['./tile-load.component.scss']
})
export class TileLoadComponent implements OnInit {
  @Input()
  height = 100;

  @Input()
  width = 100;

  public currentLoad = 42;
  private mqttSubscription$: Subscription;

  extraDyGraphConfig = {
    logscale: false,
    colors: ['red']
  };

  constructor(private mqtt: MqttService) {}

  ngOnInit() {
    const topic = '+/system';
    this.mqtt.subscribeTopic(topic);
    this.mqttSubscription$ = this.mqtt.observableTopics$[topic].subscribe(
      (obj: Object) => this.updateLoad(obj)
    );
    this.triggerChange();
  }

  triggerChange() {
    this.changeTrigger = !this.changeTrigger;
  }

  updateLoad(msg: Object) {
    if (msg['system_load']) {
      console.log(msg);

      this.currentLoad = msg['system_load'];
      const newRow = [new Date(msg['UTS'] * 1000), msg['system_load']];
      if (
        this.dygData.length === 2 &&
        this.dygData[0][1] === 0 &&
        this.dygData[1][1] === 1

      ) {
        console.log('initializing')
        this.dygData = [
          [new Date(msg['UTS'] * 1000 - 3000), msg['system_load']],
          newRow
        ];
      } else {
        this.dygData.push(newRow);
      }
      console.log(cloneDeep(this.dygData));

      this.triggerChange();
    }
  }

  /* labels should be something that identifies a series:
  sources:
   * topic ($hostname/sensor/$sensor/$measurement)
   * tags (at least a set of selected, e.g. "id")
   * fieldname

   or $hostname/system/cpu_temperature_degC
  */
  dygSeries = [
    '$hostname/$sensorname/$measurement/$id/$fieldname',
    'Henri/BME280/i2c-1_0x77/gas/pressure_hPa'
  ];
  dygLabels = ['Date', 'System load']; // human readable

  dygData = [[new Date(new Date().valueOf() - 1000), 0], [new Date(), 1]]; // mit push dranhängen, wo machen wir die maxlen?
  // dygData = [[new Date(), 0]];
  changeTrigger = false;

  // MQTT queries
  // topic, topic-filter, payload-filter {tags, fields}

  /* example queries
    all temperatures
    all humidity
    all brightness
    temperature from one sensor
    all external temperatures
  */
}
