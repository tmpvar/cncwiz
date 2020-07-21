const GrblParser = require("grbl-parser");
const log = require('debug')('cncwiz:grbl')
const split = require('split2')
const through = require('through2')


module.exports = create

function create(broadcast, serial) {

  const parser = new GrblParser()
  parser.dispatcher.addToAllListeners((data) => {
    broadcast(data)
  })

  serial.pipe(split()).pipe(through((chunk, enc, done) => {
    log('grbl: %s', String(chunk))
    parser.parseData(String(chunk))
    done()
  }))


  return {
    parser: parser

  }
}