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
        state: 'connecting'
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
  }

  componentDidMount() {
    this.props.stream.on('data', (data) => {
      const obj = JSON.parse(data)
      console.log('message', obj)

      if (obj.type === 'grbl:output') {

        const message = obj.data
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

  render() {
    console.log(this.state)
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
