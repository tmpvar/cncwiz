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
          console.log("handle waiter:", message.type)
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
    this.props.stream.write(data + '\r\n')
  }

  // TODO: specify the alarm or error that would cause this to blow up
  async waitFor(eventName) {
    return new Promise((resolve, reject) => {
      if (!this.waiters[eventName]) {
        this.waiters[eventName] = []
      }

      this.waiters[eventName].push(resolve)
    })
  }

  async probeToolHeight() {
    this.send('G53 G0 X-204 Y-18 F7000')
    this.send('G38.2 Z-150 F800')
    await this.waitFor('probeResult')

    this.send("G38.4 Z150 F100")
    const result = await this.waitFor("probeResult")

    // TODO: set the offset here
    this.send("G10 L20 P0 Z0");
    this.send("?");
    this.send('G53 G1 Z0 F2000');
    this.send('G53 G0 X0 Y0 F7000');
  }

  home() {
    this.send('$h\nG54')
  }

  render() {
    const state = this.state
    return (
      <div>
        <h1>status</h1>
        <ul>
          <li>status: {state.status.state}</li>
          <li>
            machine: ({state.machinePosition.x}, {state.machinePosition.y},{" "}
            {state.machinePosition.z})
          </li>
          <li>
            feedrate: ({state.realtimeFeed.realtimeFeedrate}, {state.realtimeFeed.realtimeSpindle})
          </li>
          <li>
            work coordinate offset ({state.workcoordinateOffset.x}, {state.workcoordinateOffset.y}, {state.workcoordinateOffset.z})
          </li>
          <li>
            spindle override: {state.override.spindle}
          </li>
          <li>
            feeds override: {state.override.feeds}
          </li>
          <li>
            rapid override: {state.override.rapids}
          </li>
        </ul>


        <div>
          <h2>Tool Height</h2>
          <button onClick={_ => this.probeToolHeight()}>Probe NOW</button>

        </div>
        <div>
          <h2>Home</h2>
          <button onClick={_ => this.home()}>HOME NAOW</button>

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
