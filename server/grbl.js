const GrblParser = require("grbl-parser");


const log = require('debug')('cncwiz:grbl')
const split = require('split2')
const through = require('through2')

module.exports = create

const commands = {
  'soft-reset': Buffer.from([0x18]),
  'status-report': '?',
  'cycle-start-resume': '~',
  'feed-hold': '!',
  'safety-door': Buffer.from([0x84]),
  'jog-cancel': Buffer.from([0x85]),
  'feed=100%': Buffer.from([0x90]),
  'feed+=10%': Buffer.from([0x91]),
  'feed-=10%': Buffer.from([0x92]),
  'feed+=1%': Buffer.from([0x93]),
  'feed-=1%': Buffer.from([0x94]),
  'rapid=100%': Buffer.from([0x95]),
  'rapid=50%': Buffer.from([0x96]),
  'rapid=25%': Buffer.from([0x97]),
  'spindle=100%': Buffer.from([0x99]),
  'spindle+=10%': Buffer.from([0x9A]),
  'spindle-=10%': Buffer.from([0x9B]),
  'spindle+=1%': Buffer.from([0x9C]),
  'spindle-=1%': Buffer.from([0x9D]),
  'spindle-stop': Buffer.from([0x9E]),
  'toggle-flood-coolant': Buffer.from([0xA0]),
  'toggle-mist-coolant': Buffer.from([0xA1]),
}


function create(broadcast, grblArduino) {
  const parser = new GrblParser()
  let waitForOk = []
  let waitForStatus = []
  const obj = {
    parser: parser,
    async waitForOk(timeout) {
      return new Promise((resolve, reject) => {
        const waiter = { resolve, reject, packets: [] }
        waitForOk.push(waiter)

        if (timeout) {
          setTimeout(() => {
            waitForOk = waitForOk.filter(a => {
              if (a !== waiter) {
                return true
              }

              waiter.reject(new Error('timeout'))
            })
          }, timeout)
        }
      })
    },

    status() {
      return new Promise((resolve, reject) => {
        grblArduino.connection.write('?')
        waitForStatus.push(resolve)
      })
    },

    commands: commands
  }
  // monkeypatch grbl-parser so we get all events out.
  // was experiencing some trouble with probe results
  parser.dispatcher.dispatch = (name, data) => {
    if (name === 'initialize') {
      tick()
      broadcast({
        type: 'grbl:connect'
      })
    }

    if (name === 'status') {
      waitForStatus.forEach(resolve => resolve(data.data))
      waitForStatus = []
    }

    if (data.type === 'success' && waitForOk.length) {
      const waiter = waitForOk.shift()
      waiter.resolve(waiter.packets)
      return
    }

    if (data.type === 'error' && waitForOk.length) {
      waitForOk.shift().reject(data)
      return
    }

    if (!waitForOk.length) {
      const input = data.input.trim()
      // don't output status message results (spam)
      if (data.input[0] !== '<') {
        console.log("⬅  %s", data.input.trim());

      }
    } else {
      // filter out status messages that may of occurred during probing or similar.
      if (data.input[0] !== "<") {
        waitForOk[0].packets.push(data);
      }
    }

    broadcast(data)
  }

  let ticker = null
  let lastJog = Number.MAX_VALUE
  async function tick() {
    clearTimeout(ticker)
    const result = await obj.status()

    let timeout = 500

    if (result.status && result.status.state === "Jog") {
      lastJog = Date.now()
    }

    if (Date.now() - lastJog < 10000) {
      timeout = 0
    }

    ticker = setTimeout(tick, timeout)
  }

  grblArduino.events.on('disconnect', _ => {
    clearTimeout(ticker)
  })

  grblArduino.connection.pipe(split()).pipe(
    through((chunk, enc, done) => {
      const str = String(chunk).trim();
      if (!str) {
        return done();
      }

      try {
        parser.parseData(str);
      } catch (e) {
        log('ERROR: grbl parser could not parse "%s"', str)
      }
      done();
    })
  );

  return obj
}