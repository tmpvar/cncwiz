import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import {BrowserRouter} from 'react-router-dom'

import skateboard from 'skateboard';
import { v4 as uuid } from 'uuid'
import { EventEmitter } from 'events'


class Machine extends EventEmitter {
  constructor(stream) {
    super();

    this.send = function (data) {
      data.id = uuid();
      stream.write(JSON.stringify(data) + "\n");
      return data.id
    };

    let eventWaiters = {};
    let resultWaiters = {};

    // TODO: specify the alarm or error that would cause this to blow up
    this.waitForEvent = function (eventName) {
      return new Promise((resolve, reject) => {
        if (!eventWaiters[eventName]) {
          eventWaiters[eventName] = [];
        }

        eventWaiters[eventName].push(resolve);
      });
    }

    this.waitForResult = function (id) {
      return new Promise((resolve, reject) => {
        resultWaiters[id] = { resolve, reject };
      });
    }

    stream.on('disconnection', () => {
      this.emit('disconnect')
      eventWaiters = {}
      resultWaiters = {}
    })

    stream.on("data", (data) => {
      const obj = JSON.parse(data);
      if (obj.type === 'grbl:disconnect') {
        console.log('grbl:disconnect')
        this.emit('disconnect')

      }

      if (obj.type === 'grbl:connect') {
        console.log('grbl:connect')
        this.emit('connect')
      }

      if (obj.type === "result" && resultWaiters[obj.id]) {
        resultWaiters[obj.id].resolve(obj)
        delete resultWaiters[obj.id]
        return;
      }

      if (obj.type === "error" && resultWaiters[obj.id]) {
        resultWaiters[obj.id].reject(obj.data)
        delete resultWaiters[obj.id]
        return;
      }

      if (obj.type === "grbl:output") {
        const message = obj.data;

        if (
          eventWaiters[message.type] &&
          eventWaiters[message.type].length
        ) {
          eventWaiters[message.type].shift()(message);
        }

        if (!message.data) {
          return;
        }

        this.emit("data", obj);
        this.emit(message.type, obj)
      }
    });
  }

  command(name) {
    this.send({
      type: "command",
      data: name,
    });
  }

  gcode(line) {
    return this.send({
      type: "gcode",
      data: line + "\n",
    });
  }

  statusCoordinates() {
    return this.waitForResult(this.gcode("$#"))
  }

  statusGcodeState() {
    return this.waitForResult(this.gcode("$G"));
  }

  jog(gcode) {
    this.gcode("$J=" + gcode);
  }

  jogCancel() {
    this.command("jogCancel");
  }
}

const stream = skateboard({ port: 9876 })
const machine = new Machine(stream);
window.machine = machine

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <App machine={machine} stream={stream} />
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();


