const startGrblArduino = require('./grbl-arduino')
const startGrbl = require('./grbl')
const skateboard = require('skateboard')

module.exports = start
const log = require('debug')('cncwiz:server')
const through = require('through2')
const chalk = require('chalk')
function json(b) {
  const s = String(b).trim()
  try {
    return JSON.parse(s)
  } catch (e) {
    log('ERROR: invalid message "%s"', s)
  }
}

function start() {
  const server = {}

  const grblArduino = startGrblArduino()
  let connections = []

  function bcast(data) {
    const str = JSON.stringify(data) + '\n'
    connections.forEach(stream => stream.write(str))
  }

  const gcodeWriter = through.obj(async (o, enc, done) => {
    const sendLine = o.data.trim() + '\n'
    process.stdout.write("➡  " + sendLine.trim() + ' (GCODE) .. ')
    grblArduino.connection.write(sendLine)
    try {
      if (!server.grbl) {
        throw new Error("Not connected to grbl")
      }

      const results = await server.grbl.waitForOk()
      console.log(chalk.green('✔'))
      if (results.length) {
        results.forEach((r, i) => {
          let prefix = "";
          if (i === results.length - 1) {
            prefix = chalk.green("⬅   ");
          } else {
            prefix = "    ";
          }

          console.log(prefix + chalk.green(r.input));
        });

        bcast({
          type: "result",
          id: o.id,
          input: sendLine.trim(),
          results: results,
        });
      }

    } catch (e) {
      console.log('❌')
      console.log('   ' + chalk.red(e.input))
      if (e.data && e.data.message) {
        console.log(chalk.red('⬅  ' + e.data.message))
      } else {
        console.log(chalk.red(e.stack));
      }
      bcast({
        type: 'error',
        data: e
      })

    }
    done()
  })

  skateboard({ port: 9876 }, (stream) => {
    connections.push(stream)

    stream.on('end', _ => {
      connections = connections.filter((a) => a !== stream)
    })

    stream.pipe(through(async (chunk, enc, done) => {
      const str = String(chunk).trim()
      const o = json(str)

      done();
      if (!o) {
        return
      }

      if (grblArduino.connection) {
        switch (o.type) {
          // handle realtime commands
          case 'command':
            if (!server.grbl.commands[o.data]) {
              log('ERROR: invalid command "%s"', o.data)
              return
            }

            const sendCommand = server.grbl.commands[o.data];
            const isBuffer = Buffer.isBuffer(sendCommand)
            console.log("➡  " + (isBuffer ? `0x${sendCommand.toString('hex')}` : sendCommand.trim()) + ' (CMD)');
            grblArduino.connection.write(sendCommand);
          break;

          case 'gcode':
            gcodeWriter.write(o)
          break;

          default:
            log('ERROR: unknown message type: "%s"', o.type)
        }
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
  })

  grblArduino.events.on('disconnect', () => {
    bcast({
      type: "grbl:disconnect",
    });
  })
}


if (!module.parent) {
  const server = start()

}