const GrblParser = require("grbl-parser");


const log = require('debug')('cncwiz:grbl')
const split = require('split2')
const through = require('through2')


module.exports = create

function create(broadcast, grblArduino) {
  const parser = new GrblParser()
  const waitForOk = []

  const obj = {
    parser: parser,
    async waitForOk() {
      return new Promise((resolve, reject) => {
        waitForOk.push(resolve)
      })
    }
  }
  // monkeypatch grbl-parser so we get all events out.
  // was experiencing some trouble with probe results
  parser.dispatcher.dispatch = (name, data) => {

    if (data.type === 'success' && waitForOk.length) {
      waitForOk.shift()()
    }

    broadcast(data)
  }

  async function tick() {
    grblArduino.status()
    await obj.waitForOk()
    setTimeout(tick, 500)
  }
  tick()


  grblArduino.connection.pipe(split()).pipe(
    through((chunk, enc, done) => {
      const str = String(chunk).trim();
      if (!str) {
        return done();
      }

      console.log("<- %s", str.trim());
      parser.parseData(str);
      done();
    })
  );

  return obj
}