const skateboard = require('skateboard')
const SerialPort = require('@serialport/stream')
const Bindings = require("@serialport/Bindings");

SerialPort.Binding = Bindings

const split = require('split2')
const through = require('through2')
const log = require('debug')('cncwiz:serial')
const EventEmitter = require('events')

module.exports = start

function start() {
  const serial = {
    connection: null,
    events: new EventEmitter(),

    status() {
      if (this.connection) {
        this.connection.write('?');
        return true
      }
    },
  }

  function pollList() {
    SerialPort.list().then((list) => {
      serial.ports = list.filter((a) => String(a.manufacturer).includes('Arduino'))

      if (serial.ports.length && !serial.connection) {
        const port = serial.ports[0]

        serial.connection = new SerialPort(serial.ports[0].path, { baudRate: 115200 })
        log("connecting to %s", port.path)

        serial.events.emit('connect', serial.connection)

        serial.connection.on('close', _ => {
          log('disconnected')
          serial.connection = null
          serial.events.emit('disconnect')
        })
      }
    }).catch((err) => {
      log("ERROR %s", err)
    })
  }

  setInterval(pollList, 1000)
  return serial
}

if (!module.parent) {
  start()
}
