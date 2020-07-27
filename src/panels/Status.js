import React from 'react'
import "./Status.css";


function float(f) {
  if (!f) {
    return '0.00'
  }

  return (Math.round(f * 100) / 100).toFixed(2);
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
      this.change(e.target.value);
    };
  }
  updateValue(e) {
    this.setState({
      value: e.target.value,
    });

    if (e.type === "keydown" && e.key === "Enter") {
      console.log("change");
      this.change(e.target.value);
    }
  }

  render() {
    const state = this.state;
    return (
      <input
        value={state.value}
        onChange={(e) => this.updateValue(e)}
        onKeyDown={(e) => this.updateValue(e)}
        // onKeyDown={this.handleKeydown()}
        // // onChange={this.handleChange() }
        onBlur={this.handleChange()}
      ></input>
    );
  }
}


function CoordinateLine(props) {
  const pos = props.pos
  const className = props.name === props.activeWCS
  ? 'active'
  : 'inactive'

  const clickHandler = props.onClick || (_ => {})

  function clearSelection() {
    document.getSelection().removeAllRanges()
  }

  function onChange(index, axis) {
    return value => {
      props.onChange({
        index: index,
        axis: axis,
        value: parseFloat(value)
      });
    }
  }
  return (
    <p className={className}>
      <span className="labels" onClick={clickHandler}>
        <span className="index">{props.index ? props.index : ""}</span>
        <span className="name">{props.name}</span>
      </span>
      <NumericInput
        key={props.name + "_x"}
        value={props.pos.x}
        onChange={onChange(props.index, "X")}
        onBlur={clearSelection}
      />
      <NumericInput
        key={props.name + "_y"}
        value={props.pos.y}
        onChange={onChange(props.index, "Y")}
        onBlur={clearSelection}
      />
      <NumericInput
        key={props.name + "_z"}
        value={props.pos.z}
        onChange={onChange(props.index, "Z")}
        onBlur={clearSelection}
      />
    </p>
  );
}

function Status(props) {
  const value = props.value
  const classes = ['status']

  if (value === 'Alarm') {
    classes.push('alarm');
  }


  return <div className={classes.join(' ')}>{value}</div>
}

export default class StatusPanel extends React.Component {
  constructor() {
    super()

     this.state = {
       status: "Unknown",
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

      const obj = {}
      coords.results.forEach((result) => {
        switch (result.type) {
          case 'gcodeSystem':
            obj[result.data.code] = result.data.coordinates
            break;
          case 'probeResult':
            obj.PRB = result.data.location;
          break;
          default:
            return
        }
      })
      this.ticker = setTimeout(this.pollStatus.bind(this), 500);
      const activeWCS = gcodeState.results[0].data.codes.filter(Boolean).find((code) => code.name === "WCS").code;

      this.setState(Object.assign(
        {},
        obj,
        {
          coordinates: obj,
          activeWCS: activeWCS
        }
      ))
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
    }
  }

  render() {
    const state = this.state
    // console.log(state)
    const coords = state.coordinates
    return (
      <div className="panel" id="status">
        <h1>Status</h1>
        <Status value={state.status} />
        <h2>Machine Absolute Position</h2>
        <CoordinateLine name="ABS" pos={state.machinePosition} />
        { coords && (
          <div>
            <h2>Work Coordinate Systems</h2>
            <CoordinateLine index={1} onChange={this.handleWCSChange()} onClick={this.handleWCSSelection("G54")} activeWCS={state.activeWCS} name="G54" pos={coords.G54} />
            <CoordinateLine index={2} onChange={this.handleWCSChange()} onClick={this.handleWCSSelection("G55")} activeWCS={state.activeWCS} name="G55" pos={coords.G55} />
            <CoordinateLine index={3} onChange={this.handleWCSChange()} onClick={this.handleWCSSelection("G56")} activeWCS={state.activeWCS} name="G56" pos={coords.G56} />
            <CoordinateLine index={4} onChange={this.handleWCSChange()} onClick={this.handleWCSSelection("G57")} activeWCS={state.activeWCS} name="G57" pos={coords.G57} />
            <CoordinateLine index={5} onChange={this.handleWCSChange()} onClick={this.handleWCSSelection("G58")} activeWCS={state.activeWCS} name="G58" pos={coords.G58} />
            <CoordinateLine index={6} onChange={this.handleWCSChange()} onClick={this.handleWCSSelection("G59")} activeWCS={state.activeWCS} name="G59" pos={coords.G59} />
            <h2>Predefined Positions</h2>
            <CoordinateLine name="G28" pos={coords.G28} />
            <CoordinateLine name="G30" pos={coords.G30} />
            <h2>Tool Offset</h2>
            <CoordinateLine name="TLO" pos={coords.TLO} />
            <h2>Last Probe Position</h2>
            <CoordinateLine name="PRB" pos={coords.PRB} />
            <h2>Coordinate System Offset</h2>
            <CoordinateLine name="G92" pos={coords.G92} />
          </div>
        )}
      </div>
    );
  }
}