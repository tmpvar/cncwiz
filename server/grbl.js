const GrblParser = require("grbl-parser");


const log = require('debug')('cncwiz:grbl')
const split = require('split2')
const through = require('through2')


module.exports = create

function create(broadcast, serial) {

  const parser = new GrblParser()

  // monkeypatch grbl-parser so we get all events out.
  // was experiencing some trouble with probe results
  parser.dispatcher.dispatch = (name, data) => {
    broadcast(data)
  }

  serial.pipe(split()).pipe(through((chunk, enc, done) => {
    const str = String(chunk).trim()
    if (!str) {
      return done();
    }

    console.log('grbl: %s', str)
    parser.parseData(str)
    done()
  }))

  return {
    parser: parser

  }
}