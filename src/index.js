import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import {BrowserRouter} from 'react-router-dom'

import skateboard from 'skateboard';
import { v4 as uuid } from 'uuid'
import { EventEmitter } from 'events'


class Machine extends EventEmitter{
  constructor(stream) {
    super()

    this.send = function (data) {
      data.id = uuid();
      stream.write(JSON.stringify(data) + "\n");
    }

    this.waiters = {}

    stream.on('data', (data) => {
      const obj = JSON.parse(data);

       if (obj.type === 'grbl:output') {

        const message = obj.data

        if (this.waiters[message.type] && this.waiters[message.type].length) {
          this.waiters[message.type].shift()(message)
        }
        // if (message.type === 'probingResult')

        if (!message.data) {
          return
        }

        this.emit('data', obj)
      }
    })
  }



  command(name) {
    this.send({
      type: "command",
      data: name,
    });
  }

  gcode(line) {
    this.send({
      type: "gcode",
      data: line + "\n",
    });
  }

  // TODO: specify the alarm or error that would cause this to blow up
  waitFor(eventName) {
    return new Promise((resolve, reject) => {
      if (!this.waiters[eventName]) {
        this.waiters[eventName] = [];
      }

      this.waiters[eventName].push(resolve);
    });
  }

  jog(gcode) {
    this.gcode("$J=" + gcode);
  }

  jogCancel() {
    this.command("jogCancel");
  }
}

const stream = skateboard({ port: 9876 })


ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <App machine={new Machine(stream)} stream={stream} />
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();


