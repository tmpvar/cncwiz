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

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />

        <div>

        </div>
      </header>
      <content>
        <Switch>
          <Route exact path="/">
            <Home />
          </Route>
          <Route path="/probing">
            <Probing />
          </Route>
        </Switch>
      </content>
    </div>
  );
}

export default App;
