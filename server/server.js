const startGrblArduino = require('./grbl-arduino')
const startGrbl = require('./grbl')
const skateboard = require('skateboard')
const { loadPartialConfig } = require('@babel/core')
module.exports = start

const through = require('through2')

function start() {
  const server = {

  }

  const grblArduino = startGrblArduino()
  let connections = []

  function bcast(data) {
    const str = JSON.stringify(data) + '\n'
    connections.forEach(stream => stream.write(str))
  }

  skateboard({ port: 9876 }, (stream) => {
    connections.push(stream)

    stream.on('end', _ => {
      connections = connections.filter((a) => a !== stream)
    })

    stream.pipe(through(async (chunk, enc, done) => {
      if (grblArduino.connection) {
        const str = String(chunk).trim()
        console.log("->", str);
        grblArduino.connection.write(str + "\n");
        await server.grbl.waitForOk()
        done()
      }
    }))
  })

  grblArduino.events.on('connect', () => {
    server.grbl = startGrbl((data) => {
      bcast({
        type: "grbl:output",
        data: data,
      });
    }, grblArduino);

    grblArduino.status()
  })
}


if (!module.parent) {
  const server = start()

}