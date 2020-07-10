import React from 'react'
import {Switch, Route, Link} from 'react-router-dom'
import icon from '../icon.png'
import ToolHeight from './flows/probing/ToolHeight'

export default function Probing() {
  return (
    <div className="page">
      <h1>Probing</h1>

      <Link to="/">Home</Link>

      <div className="blocks">
        <div className="block">
          <Link to="/probing/tool-height">
            <img src={icon} />
            <description>Tool Height</description>
          </Link>
        </div>
        <div className="block">
          <Link to="/probing/tool-height">
            <img src={icon} />
            <description>Work Location</description>
          </Link>
        </div>
        <div className="block">
          <Link to="/probing/tool-height">
            <img src={icon} />
            <description>tool height</description>
          </Link>
        </div>
        <div className="block">
          <Link to="/probing/tool-height">
            <img src={icon} />
            <description>tool height</description>
          </Link>
        </div>
        <div className="block">
          <Link to="/probing/tool-height">
            <img src={icon} />
            <description>tool height</description>
          </Link>
        </div>
        <div className="block">
          <Link to="/probing/tool-height">
            <img src={icon} />
            <description>tool height</description>
          </Link>
        </div>
        <div className="block">
          <Link to="/probing/tool-height">
            <img src={icon} />
            <description>tool height</description>
          </Link>
        </div>
        <div className="block">
          <Link to="/probing/tool-height">
            <img src={icon} />
            <description>tool height</description>
          </Link>
        </div>
        <div className="block">
          <Link to="/probing/tool-height">
            <img src={icon} />
            <description>tool height</description>
          </Link>
        </div>
        <div className="block">
          <Link to="/probing/tool-height">
            <img src={icon} />
            <description>tool height</description>
          </Link>
        </div>
      </div>

      <Switch>
        <Route path="/probing/tool-height">
          <ToolHeight />
        </Route>
      </Switch>

    </div>
  )
}