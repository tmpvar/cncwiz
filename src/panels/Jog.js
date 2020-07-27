import React from 'react'

import Arrow from '../svg/arrow'
import './Jog.css'

export default class JogPanel extends React.Component {
  constructor() {
    super()

    // TODO: read this out of local storage
    this.state = {
      speed: 2000,
      distance: 1
    }
  }

  handleJog(axis, dir) {
    return () => {
      const state = this.state;
      const neg = dir < 0 ? "-" : "";
      this.props.machine.jog(`G91 ${axis} ${neg}${state.distance} F${state.speed}`);
    };
  }

  handleJogCancel() {
    return () => {
      this.jogCancel();
    };
  }

  updateJogDistance(e) {
    this.setState(Object.assign({}, this.state, {
      distance: e.target.value
    }))
  }

  updateJogSpeed(e) {
    this.setState(Object.assign({}, this.state, {
      speed: e.target.value
    }))
  }

  render() {
    const state = this.state
    return (
      <div className="panel" id="jog">
        <h1>JOG</h1>
        <section className="inputs">
          <section className="distance">
            <input
              value={state.distance}
              onChange={(e) => this.updateJogDistance(e)}
              onKeyDown={(e) => this.updateJogDistance(e)}
            ></input>
            <span>mm</span>
          </section>
          <section className="speed">
            <input
              value={state.speed}
              onChange={(e) => this.updateJogSpeed(e)}
            ></input>
            <span>
              mm
              <br />
              min
            </span>
          </section>
        </section>
        <section className="buttons">
          <button className="up y-axis" onClick={this.handleJog("y", 1)}>
            <Arrow />
          </button>
          <button className="down y-axis" onClick={this.handleJog("y", -1)}>
            <Arrow />
          </button>
          <button className="left x-axis" onClick={this.handleJog("x", -1)}>
            <Arrow />
          </button>
          <button className="right x-axis" onClick={this.handleJog("x", 1)}>
            <Arrow />
          </button>

          <button className="up z-axis" onClick={this.handleJog("z", 1)}>
            <Arrow />
          </button>
          <button className="down z-axis" onClick={this.handleJog("z", -1)}>
            <Arrow />
          </button>
        </section>

        <button className="stop" onClick={this.handleJogCancel()}>
          Stop
        </button>
      </div>
    );
  }
}