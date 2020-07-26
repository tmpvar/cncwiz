import React from 'react';
import logo from './icon.png';
import './App.css';


import {
  Switch,
  Link,
  Route
} from "react-router-dom";

import Home from './pages/Home'
import Probing from './pages/Probing'
import Arrow from './svg/arrow'
import {vec2, vec3} from 'gl-matrix'
import circumcenter from 'circumcenter'
var currentId = 0;

function float(f, places) {
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
      jog: {
        distance: 1,
        speed: 2000
      }

    }

    this.waiters = {}
  }

  componentDidMount() {
    this.props.stream.on('data', (data) => {
      const obj = JSON.parse(data)
      // console.log('message', obj)

      if (obj.type === 'grbl:output') {

        const message = obj.data

        if (this.waiters[message.type] && this.waiters[message.type].length) {
          this.waiters[message.type].shift()(message)
        }
       // if (message.type === 'probingResult')

        if (!message.data) {
          return
        }

        const newState = Object.assign({}, this.state, obj.data.data);
        newState.raw = obj.data
        this.setState(newState)
      }
    })
  }

  send(data) {
    data.id = currentId ++
    this.props.stream.write(JSON.stringify(data) + '\n')
  }

  command(name) {
    this.send({
      type: 'command',
      data: name,
    })
  }

  gcode(line) {
    this.send({
      type: 'gcode',
      data: line + '\n'
    })
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
    this.gcode('G53 G0 Z0 F7000')
    this.gcode('G53 G0 X-193 Y-20 F7000')
    this.gcode('G38.2 Z-150 F400')
    this.waitFor('probeResult').then(() => {
      this.gcode("G38.4 Z10 F400")
      this.waitFor("probeResult").then(_ => {
        // TODO: set the offset here
        this.gcode("G10 L20 P1 Z0");
        this.gcode('G53 G1 Z0 F2000');
        this.gcode('G53 G0 X0 Y0 F7000');
      })
    })
  }

  probeTest() {
    this.gcode('G53 G0 Z0 F700')
    this.gcode('G53 G0 X-60 Y-31 F700')
    this.gcode('G53 G0 Z-44 F700')
    this.gcode('G38.2 x150 F100')
    this.waitFor('probeResult').then(() => {
      this.gcode("G38.4 X-150 F10")
      this.waitFor("probeResult").then(r => {
        console.log(r)
        // TODO: set the offset here
        // this.gcode("G10 L20 P1 Z0");
        this.gcode('G53 G1 Z0 F2000');
        this.gcode('G53 G0 X0 Y0 F7000');
      })
    })
  }

  probeBore() {

    // this.gcode("G53 G0 Z0 F700");
    // this.gcode("G53 G0 X-42.219 Y-29.328 F700");
    // // this.gcode(`G53 G0 X-10  Y0 F700`);
    // // this.gcode("G53 G0 X-42.219 Y-29.328 F700");
    // this.gcode(`G3 I5 J0 X-42.219 Y-29.328 F700`);
    // // this.gcode(`G53 G0 X-${float(39.3 + 2.919)}  Y-29.328 F700`);
    // // this.gcode("G53 G0 X-42.219 Y-29.328 F700");
    // // this.gcode('G53 G0 Z-45 F700')
    // // this.gcode("G53 G0 Z-45 F700");
    // // this.gcode(`G3 X-${float(39.3 + 2.919)} Y-29.328 I0 J-2.919`);

    // return
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
          this.gcode(`G38.2 ${axis}${dir * 500} F400`)
          this.waitFor('probeResult').then(resultEnter => {
            this.gcode(`G38.4 ${axis}${-dir * 500} F100`)
            this.waitFor("probeResult").then(resultExit => {
              resolve({
                enter: resultEnter.data,
                exit: resultExit.data
              })
            })
          })
        })
      }
    }

    const move = (gcode) => {
      return () => {
        return new Promise((resolve, reject) => {
          this.gcode(gcode)
          resolve()
        })
      }
    }

    this.gcode('G53 G0 Z0 F700')
    this.gcode('G53 G0 X-40 Y-30 F700')
    // this.gcode('G53 G0 Z-45 F700')
    this.gcode('G53 G0 Z-45 F700')



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
      this.gcode(`G53 G1 ${arcStart} F2000`);
      this.gcode(`G53 G1 Z-4c5 F2000`);

      for (var i=0; i<10; i++) {
        // this.gcode(`G3 I5 J0 X-42.219 Y-29.328 F700`);
        this.gcode(`G3 ${arcStart} I0 J-${float(sr, 3)} F4000`);
      }

      this.gcode(`G53 G1 X${float(c[0], 3)} Y${float(c[1], 3)} F2000`)

      console.log('done', points, c, r)
      this.gcode('G53 G1 Z0 F2000');
      this.gcode('G53 G0 X0 Y0 F7000');
    })

  }


  home() {
    this.gcode('$h')
  }

  reset() {
    this.command('soft-reset')
  }

  jog(gcode) {
    this.gcode('$J=' + gcode)
  }

  gcodeKeypress(e) {
    if (e.key === 'Enter') {
      this.gcode(e.target.value)
      e.target.value = ''
    }
  }

  updateJogDistance(e) {
    this.setState(Object.assign({}, this.state, {
      jog: Object.assign({}, this.state.jog, {
        distance: e.target.value
      })
    }))
  }

  updateJogSpeed(e) {
    this.setState(Object.assign({}, this.state, {
      jog: Object.assign({}, this.state.jog, {
        speed: e.target.value
      })
    }))
  }

  runJog(axis, dir) {
    return () => {
      const state = this.state
      const neg = dir < 0 ? '-' : ''
      this.jog(`G91 ${axis} ${neg}${state.jog.distance} F${state.jog.speed}`)
    }
  }

  cancelJog() {
    return () => {
      this.command('jog-cancel')
    }
  }

  render() {
    const state = this.state
    return (
      <div>
        <div className="panel" id="jog">
          <h1>JOG</h1>
          <section className="inputs">
            <section className="distance">
              <input
                value={state.jog.distance}
                onChange={e => this.updateJogDistance(e) }
                onKeyDown={e => this.updateJogDistance(e) }
              ></input><span>mm</span>
            </section>
            <section className="speed">
              <input
                value={state.jog.speed}
                onChange={e => this.updateJogSpeed(e) }
                onChange={e => this.updateJogSpeed(e) }
              ></input><span>mm<br />min</span>
            </section>

            </section>
          <section className="buttons">
            <button className="up y-axis" onClick={this.runJog('y', -1)}><Arrow /></button>
            <button className="down y-axis" onClick={this.runJog('y', 1)}><Arrow /></button>
            <button className="left x-axis" onClick={this.runJog('x', -1)}><Arrow /></button>
            <button className="right x-axis" onClick={this.runJog('x', 1)}><Arrow /></button>

            <button className="up z-axis" onClick={this.runJog('z', 1)}><Arrow /></button>
            <button className="down z-axis" onClick={this.runJog('z', -1)}><Arrow /></button>
          </section>

          <button className="stop" onClick={this.cancelJog()}>Stop</button>

        </div>

        <h1>status</h1>
        <ul>
          <li>status: {state.status.state}</li>
          <li>
            machine: ({float(state.machinePosition.x)}, {float(state.machinePosition.y)},{" "}
            {float(state.machinePosition.z)})
          </li>
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
          <button onClick={(_) => this.command("feed-hold")}>FEED HOLD</button>
          <button onClick={(_) => this.command("cycle-start-resume")}>
            Cycle Start
          </button>
        </div>
        <div>
          <h2>GCODE</h2>
          <input type="text" onKeyDown={(e) => this.gcodeKeypress(e)}></input>
        </div>

        <div>
          <h2>Jog</h2>
          <ul>
            <li>
              X:
              <button onClick={(_) => this.jog("G91 X+10 F10000\n")}>+</button>
              <button onClick={(_) => this.jog("G91 X-10 F10000\n")}>
                -
              </button>
            </li>
            <li>
              Y:
              <button onClick={(_) => this.jog("G91 Y+10 F10000\n")}>
                +
              </button>
              <button onClick={(_) => this.jog("G91 Y-10 F10000\n")}>
                -
              </button>
            </li>
            <li>
              Z:
              <button onClick={(_) => this.jog("G91 Z+10 F10000\n")}>
                +
              </button>
              <button onClick={(_) => this.jog("G91 Z-10 F10000\n")}>
                -
              </button>
            </li>
            <li>
              <button onClick={(_) => this.command("jog-cancel")}>
                Cancel
              </button>
            </li>
          </ul>
        </div>
      </div>
    );
  }
}

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />

//         <div>

//         </div>
//       </header>
//       <content>
//         <Switch>
//           <Route exact path="/">
//             <Home />
//           </Route>
//           <Route path="/probing">
//             <Probing />
//           </Route>
//         </Switch>
//       </content>
//     </div>
//   );
// }

export default App;
