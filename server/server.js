const startGrblArduino = require('./grbl-arduino')
const startGrbl = require('./grbl')
const skateboard = require('skateboard')
const { loadPartialConfig } = require('@babel/core')
module.exports = start

function start() {
  const server = {

  }

  const grblArduino = startGrblArduino()
  let connections = []

  function bcast(data) {
    const str = JSON.stringify(data) + '\n'
    connections.forEach(stream => stream.write(str))
  }

  skateboard({port: 9876}, (stream) => {
    connections.push(stream)

    stream.on('end', _ => {
      connections = connections.filter((a) => a !== stream)
    })

    stream.on('data', d => {
      if (grblArduino.connection) {
        grblArduino.connection.write(String(d).trim() + '\r\n')
      }
    })
  })

  grblArduino.events.on('connect', (stream) => {
    server.grbl = startGrbl((data) => {
      bcast({
        type: 'grbl:output',
        data: data
      })
    }, stream)

    grblArduino.status()
    setInterval(() => grblArduino.status(), 5000)
  })
}


if (!module.parent) {
  const server = start()

}