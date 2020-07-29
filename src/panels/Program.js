import React from 'react'
import './Program.css'

import { FixedSizeList as List } from 'react-window'

const SELECT_FILE = '(select a file)'

export default class ProgramPanel extends React.Component {

  constructor(props) {
    super(props)
    this.fileButtonRef = React.createRef()
    this.gcodeWindowRef = React.createRef()
    this.state = {
      file: SELECT_FILE,
      lines: []
    }
  }

  handleClick() {
    this.fileButtonRef.current.click()
  }

  async handleFileChange(e) {
    const input = this.fileButtonRef.current
    if (!input.files.length) {
      return
    }

    const file = input.files[0]
    if (!file) {
      return
    }

    try {

      const contents = await file.text()
      console.log()
      const lines = contents.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      this.setState({
        file: file.name + ` (lines: ${lines.length})`,
        lines: lines
      })
    } catch (e) {
      console.error('ERROR: could not read selected file', e)
    }
  }

  async handlePlayProgram() {
    if (this.playing) {
      return
    }
    const state = this.state
    const machine = this.props.machine
    this.playing = true

    for (var l = 0; l < state.lines.length; l++) {
      var line = state.lines[l]
      if (line[0] == '(') {
        continue;
      }
      this.gcodeWindowRef.current.scrollToItem(l);
      await machine.waitForResult(machine.gcode(line))
    }

    this.playing = false

  }

  render() {
    const state = this.state

    const gutterWidth = (state.lines.length + '').length * 8

    const Line = ({index, style}) => {
      return (
        <div style={style}>
          <span style={{ width: gutterWidth + "px" }} className="line-number">
            {index + 1}
          </span>
          <span>
            {state.lines[index]}
          </span>
        </div>
      )
    }

    return (
      <div className="panel" id="program">
        <h1>Program</h1>
        <section className="file-selector">
          <input
            type="file"
            onChange={(e) => this.handleFileChange(e)}
            className="hidden"
            ref={this.fileButtonRef}
            accept="/*"
          ></input>
          <button onClick={(e) => this.handleClick()}>
            <span role="img" aria-label="open">
              📂
            </span>
          </button>
          <span className="file">{state.file}</span>
        </section>
        <section className="gcode">
          <List
            height={320}
            itemCount={state.lines.length}
            itemSize={16}
            width={464}
            overscanCount={30}
            ref={this.gcodeWindowRef}
            style={{
              border: "1px solid var(--color-light)",
              overflowY: "scroll",
            }}
          >
            {Line}
          </List>
        </section>

        <section className="controls">
          <button className="play" onClick={(_) => this.handlePlayProgram()}>
            Play
          </button>
        </section>
      </div>
    );
  }


}