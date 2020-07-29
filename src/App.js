import React from 'react';
import './App.css';


import {vec2} from 'gl-matrix'
import circumcenter from 'circumcenter'

import JogPanel from './panels/Jog'
import StatusPanel from './panels/Status'
import ProgramPanel from './panels/Program'
function float(f) {
  return Math.round(f * 1000) / 1000
}

class App extends React.Component {
  constructor() {
    super()

    this.state = {
      status: {
        state: false
      },
      machinePosition: { x: 0, y: 0, z: 0 },
      realtimeFeed: {
        realtimeFeedrate: 0,
        realtimeSpindle: 0,
      },
      workcoordinateOffset: { x: 0, y: 0, z: 0},
      override: {
        spindle: 100,
        feeds: 100,
        rapids: 100
      },
    }

    this.waiters = {}
  }

  // TODO: specify the alarm or error that would cause this to blow up
  waitFor(eventName) {
    return new Promise((resolve, reject) => {
      if (!this.waiters[eventName]) {
        this.waiters[eventName] = []
      }

      this.waiters[eventName].push(resolve)
    })
  }

  probeToolHeight() {
    const machine = this.props.machine
    machine.gcode('G53 G0 Z0 F7000')
    machine.gcode('G53 G0 X-193 Y-20 F7000')
    const probeIntoId = machine.gcode('G38.2 Z-150 F400')
    machine.waitForResult(probeIntoId).then(() => {
      const probeAwayId = machine.gcode("G38.4 Z10 F400")
      machine.waitForResult(probeAwayId).then(_ => {
        // TODO: set the offset here
        machine.gcode("G10 L20 P1 Z0");
        machine.gcode('G53 G1 Z0 F2000');
        machine.gcode('G53 G0 X0 Y0 F7000');
      })
    })
  }

  probeTest() {
    const machine = this.props.machine
    machine.gcode('G53 G0 Z0 F700')
    machine.gcode('G53 G0 X-60 Y-31 F700')
    machine.gcode('G53 G0 Z-44 F700')
    const probeInto = machine.gcode('G38.2 x150 F100')
    machine.waitForResult(probeInto).then(() => {
      const probeAway = machine.gcode("G38.4 X-150 F10")
      machine.waitForResult(probeAway).then(r => {
        machine.gcode('G53 G1 Z0 F2000');
        machine.gcode('G53 G0 X0 Y0 F7000');
      })
    })
  }

  probeBore() {
    const machine = this.props.machine

    function runSerial(tasks) {
      return tasks.reduce((promiseChain, currentTask) => {
        return promiseChain.then(chainResults =>
          currentTask().then(currentResult =>
            [...chainResults, currentResult]
          )
        );
      }, Promise.resolve([])).then(arrayOfResults => {
        return arrayOfResults.filter(Boolean)
      });
    }
    const p = (axis, dir) => {
      return () => {
        return new Promise((resolve, reject) => {
          const probeInto = machine.gcode(`G38.2 ${axis}${dir * 500} F400`)
          machine.waitForResult(probeInto).then(resultEnter => {
            console.log(resultEnter)
              const probeAway = machine.gcode(`G38.4 ${axis}${-dir * 500} F100`)
              machine.waitForResult(probeAway).then(resultExit => {
                resolve({
                  enter: resultEnter.results[0].data,
                  exit: resultExit.results[0].data
                })
              })
            })
        })
      }
    }

    const move = (gcode) => {
      return () => {
        return new Promise((resolve, reject) => {
          machine.gcode(gcode)
          resolve()
        })
      }
    }

    machine.gcode('G53 G0 Z0 F700')
    machine.gcode('G53 G0 X-40 Y-30 F700')
    machine.gcode('G53 G0 Z-45 F700')

    runSerial([
      p('x', 1),
      move('G1 X-40 Y-30 F1000'),
      p('y', -1),
      move('G1 X-40 Y-30 F1000'),
      p('x', -1),
      move('G1 X-40 Y-30 F1000'),
    ]).then(results => {

      const points = results.map((r) => {

        const pos = r.exit.location
        console.log(pos.x, pos.y)
        return [pos.x, pos.y]
      })

      const c = circumcenter(points)
      const r = vec2.distance(points[0], c)
      const sr = r * 1

      const arcStart = `X${float(c[0], 3)} Y${float(c[1]+sr, 3)}`
      // this.gcode(`G53 G1 ${center} F2000`);
      machine.gcode(`G53 G1 ${arcStart} F2000`);
      machine.gcode(`G53 G1 Z-45 F2000`);

      for (var i=0; i<10; i++) {
        machine.gcode(`G3 ${arcStart} I0 J-${float(sr, 3)} F4000`);
      }

      machine.gcode(`G53 G1 X${float(c[0], 3)} Y${float(c[1], 3)} F2000`)

      console.log('done', points, c, r)
      machine.gcode('G53 G1 Z0 F2000');
      machine.gcode('G53 G0 X0 Y0 F7000');
    })

  }

  home() {
    console.log('home')
    this.props.machine.gcode('$h')
  }

  reset() {
    this.props.machine.command('soft-reset')
  }

  jog(gcode) {
    this.props.machine.gcode('$J=' + gcode)
  }

  gcodeKeypress(e) {
    if (e.key === 'Enter') {
      this.props.machine.gcode(e.target.value)
      e.target.value = ''
    }
  }

  render() {
    const state = this.state
    const machine = this.props.machine
    return (
      <div>

        <JogPanel machine={machine} />
        <StatusPanel machine={machine} />
        <ProgramPanel machine={machine} />

        <h1>status</h1>
        <ul>
          <li>
            feedrate: ({state.realtimeFeed.realtimeFeedrate},{" "}
            {state.realtimeFeed.realtimeSpindle})
          </li>
          <li>
            work coordinate offset ({state.workcoordinateOffset.x},{" "}
            {state.workcoordinateOffset.y}, {state.workcoordinateOffset.z})
          </li>
          <li>spindle override: {state.override.spindle}</li>
          <li>feeds override: {state.override.feeds}</li>
          <li>rapid override: {state.override.rapids}</li>
        </ul>

        <div>
          <h2>Tool Height</h2>
          <button onClick={(_) => this.probeToolHeight()}>Probe NOW</button>
        </div>
        <div>
          <h2>Probe test</h2>
          <button onClick={(_) => this.probeTest()}>Probe Test</button>
          <button onClick={(_) => this.probeBore()}>Probe Bore</button>
        </div>
        <div>
          <h2>Home</h2>
          <button onClick={(_) => this.home()}>HOME NAOW</button>
        </div>
        <div>
          <h2>Home</h2>
          <button onClick={(_) => this.reset()}>RESET</button>
        </div>
        <div>
          <h2>Cycle Control</h2>
          <button onClick={(_) => machine.command("feed-hold")}>FEED HOLD</button>
          <button onClick={(_) => machine.command("cycle-start-resume")}>
            Cycle Start
          </button>
        </div>
        <div>
          <h2>GCODE</h2>
          <input type="text" onKeyDown={(e) => this.gcodeKeypress(e)}></input>
        </div>
      </div>
    );
  }
}


export default App;
