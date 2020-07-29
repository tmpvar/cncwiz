import React from 'react'
import "./Status.css";
import Usb from "../svg/usb"

function toFixed(n, places) {
  const e = Math.pow(10, places);
  return Math.round(n * e) / e;
}

function displayFloat(n) {
  return toFixed(n, 2).toFixed(2)
}

class NumericInput extends React.Component {

  state = { value: this.props.value }

  change(v) {
    this.props.onChange(parseFloat(v || "0"));
  }

  handleKeydown() {
    return (e) => {
      this.setState({
        value: e.target.value,
      });
    };
  }

  handleChange() {
    return (e) => {
      this.props.value !== e.target.value && this.change(e.target.value);
    };
  }

  updateValue(e) {
    this.setState({
      value: e.target.value,
    });

    if (e.type === "keydown" && e.key === "Enter") {
      this.change(e.target.value);
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.value !== this.props.value) {
      this.setState({
        value: this.props.value
      })
    }
  }

  render() {
    const state = this.state;
    return (
      <input
        value={displayFloat(state.value, 2)}
        readOnly
        //onChange={(e) => this.updateValue(e)}
        //onKeyDown={(e) => this.updateValue(e)}
        // onKeyDown={this.handleKeydown()}
        // // onChange={this.handleChange() }
        //onBlur={this.handleChange()}
      ></input>
    );
  }
}


function CoordinateLine(props) {
  const className = props.name === props.activeWCS
  ? 'active'
  : 'inactive'

  const clickHandler = props.onClick || (_ => {})

  function clearSelection() {
    document.getSelection().removeAllRanges()
  }

   const abs = props.machinePosition || { x: 0, y: 0, z: 0 };

  function onChange(index, axis) {
    return value => {
      console.log("set", abs[axis.toLowerCase()] + parseFloat(value));
      props.onChange({
        index: index,
        axis: axis,
        value: abs[axis.toLowerCase()] + parseFloat(value)
      });
    }
  }

  return (
    <p className={className}>
      <span className="labels" onClick={clickHandler}>
        <span className="index">{props.index ? props.index : ""}</span>
        <span className="name">{props.name}</span>
      </span>
      {props.pos.x !== undefined ? (
        <NumericInput
          key={props.name + "_x"}
          value={props.pos.x}
          onChange={onChange(props.index, "X")}
          onBlur={clearSelection}
        />
      ) : null}

      {props.pos.y !== undefined ? (
        <NumericInput
          key={props.name + "_y"}
          value={props.pos.y}
          onChange={onChange(props.index, "Y")}
          onBlur={clearSelection}
        />
      ) : null}

      {props.pos.z !== undefined ? (
        <NumericInput
          key={props.name + "_z"}
          value={props.pos.z}
          onChange={onChange(props.index, "Z")}
          onBlur={clearSelection}
        />
      ) : null}
    </p>
  );
}

function Status(props) {
  const value = props.value
  const classes = ['status']

  if (value === 'Alarm' || value === 'Disconnected') {
    classes.push('alarm');
  }

  if (value === 'Disconnected') {
    return (
      <div className={classes.join(' ')}>
        <Usb />
      </div>
    )
  }
  return <div className={classes.join(' ')}>{value}</div>
}

export default class StatusPanel extends React.Component {
  constructor() {
    super()

     this.state = {
       status: 'Disconnected',
       machinePosition: { x: 0, y: 0, z: 0 },
       coordinates: null
      //   {
      //    G54: { x: 0, y: 0, z: 0 },
      //    G55: { x: 0, y: 0, z: 0 },
      //    G56: { x: 0, y: 0, z: 0 },
      //    G57: { x: 0, y: 0, z: 0 },
      //    G58: { x: 0, y: 0, z: 0 },
      //    G59: { x: 0, y: 0, z: 0 },
      //    G28: { x: 0, y: 0, z: 0 },
      //    G30: { x: 0, y: 0, z: 0 },
      //    TLO: { x: 0, y: 0, z: 0 },
      //    PRB: { x: 0, y: 0, z: 0 },
      //    G92: { x: 0, y: 0, z: 0 },
      //  },
     };

     this.ticker = null

  }

  pollStatus() {
    clearTimeout(this.ticker)
    const machine = this.props.machine
    Promise.all([
      machine.statusCoordinates(),
      machine.statusGcodeState()
    ]).then(([coords, gcodeState]) => {

      this.ticker = setTimeout(this.pollStatus.bind(this), 500);

      const obj = {}
      coords.results.forEach((result) => {
        switch (result.type) {
          case 'gcodeSystem':
            const coords = result.data.coordinates;
            const pos = {}
            obj[result.data.code] = pos
            if (coords.x !== undefined) {
              pos.x = toFixed(coords.x, 2);
            }

            if (coords.y !== undefined) {
              pos.y = toFixed(coords.y, 2);
            }

            if (coords.z !== undefined) {
              pos.z = toFixed(coords.z, 2);
            }
            break;
          case 'probeResult':
            obj.PRB = result.data.location;
          break;
          default:
            return
        }
      })

      const activeWCS = gcodeState.results[0].data.codes.filter(Boolean).find((code) => code.name === "WCS").code;

      this.setState(Object.assign(
        {},
        obj,
        {
          coordinates: obj,
          activeWCS: activeWCS
        }
      ))
    }).catch((e) => {
      if (e.data && e.data.code === 8) {
        this.ticker = setTimeout(this.pollStatus.bind(this), 500);
        return
      }

      throw e

    })
  }

  componentDidMount() {
    const machine = this.props.machine

    machine.on("status", (obj) => {
      const message = obj.data
      const data = message.data

      const newState = Object.assign({}, this.state, {
        machinePosition: data.machinePosition,
        status: data.status.state
      });

      this.setState(newState);
    });

    machine.on('disconnect', () => {
      this.setState(Object.assign({}, this.state, {
        status: 'Disconnected'
      }))
    })

    machine.on('connect', () => {
      this.pollStatus()
    })

    this.pollStatus();
  }

  handleWCSSelection(code) {
    return _ => {
      this.props.machine.gcode(code)
      this.pollStatus()
    }
  }

  handleWCSChange() {
    return ({index, axis, value}) => {
      // TODO: use the machine coords to compute an offset
      this.props.machine.gcode(`G10 L20 P${index} ${axis}${value}`)
      this.pollStatus();
    }
  }

  render() {
    const state = this.state
    // console.log(state)
    const coords = state.coordinates

    if (state.status === 'Disconnected') {
      return (
        <div className="panel alarm" id="status">
          <h1>Status</h1>
          <Status value={state.status} />
          <p>Please plug the arduino into a usb port on the host computer</p>
        </div>
      )
    }

    if (state.status === 'Alarm') {
      return (
        <div className="panel alarm" id="status">
          <h1>Status</h1>
          <Status value={state.status} />
          <p>Please home (preferred) or unlock (dangerous) the machine</p>
        </div>
      )
    }


    return (
      <div className="panel" id="status">
        <h1>Status</h1>
        <Status value={state.status} />
        <h2>Machine Absolute Position</h2>
        <CoordinateLine
          name="ABS"
          pos={state.machinePosition}
        />
        {coords && (
          <div>
            <h2>Work Coordinate Systems</h2>
            <CoordinateLine
              index={1}
              onChange={this.handleWCSChange()}
              onClick={this.handleWCSSelection("G54")}
              activeWCS={state.activeWCS}
              name="G54"
              pos={coords.G54}
              machinePosition={state.machinePosition}
            />
            <CoordinateLine
              index={2}
              onChange={this.handleWCSChange()}
              onClick={this.handleWCSSelection("G55")}
              activeWCS={state.activeWCS}
              name="G55"
              pos={coords.G55}
              machinePosition={state.machinePosition}
            />
            <CoordinateLine
              index={3}
              onChange={this.handleWCSChange()}
              onClick={this.handleWCSSelection("G56")}
              activeWCS={state.activeWCS}
              name="G56"
              pos={coords.G56}
              machinePosition={state.machinePosition}
            />
            <CoordinateLine
              index={4}
              onChange={this.handleWCSChange()}
              onClick={this.handleWCSSelection("G57")}
              activeWCS={state.activeWCS}
              name="G57"
              pos={coords.G57}
              machinePosition={state.machinePosition}
            />
            <CoordinateLine
              index={5}
              onChange={this.handleWCSChange()}
              onClick={this.handleWCSSelection("G58")}
              activeWCS={state.activeWCS}
              name="G58"
              pos={coords.G58}
              machinePosition={state.machinePosition}
            />
            <CoordinateLine
              index={6}
              onChange={this.handleWCSChange()}
              onClick={this.handleWCSSelection("G59")}
              activeWCS={state.activeWCS}
              name="G59"
              pos={coords.G59}
              machinePosition={state.machinePosition}
            />
            <h2>Predefined Positions</h2>
            <CoordinateLine
              name="G28"
              pos={coords.G28}
              machinePosition={state.machinePosition}
            />
            <CoordinateLine
              name="G30"
              pos={coords.G30}
              machinePosition={state.machinePosition}
            />
            <h2>Tool Offset</h2>
            <CoordinateLine
              name="TLO"
              pos={coords.TLO}
              machinePosition={state.machinePosition}
            />
            <h2>Last Probe Position</h2>
            <CoordinateLine
              name="PRB"
              pos={coords.PRB}
              machinePosition={state.machinePosition}
            />
            <h2>Coordinate System Offset</h2>
            <CoordinateLine
              name="G92"
              pos={coords.G92}
              machinePosition={state.machinePosition}
            />
          </div>
        )}
      </div>
    );
  }
}