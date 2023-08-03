import { Component, Fragment } from 'react'

const forecastDayFmt = { weekday: 'short' }
const nowDateFmt = {
  hour: 'numeric',
  hour12: true,
  minute: 'numeric',
  second: 'numeric',
}
const forecastHourFmt = {
  hour: 'numeric',
  hour12: true,
}
const dailyDateFmt = {
  day: 'numeric',
  month: 'short',
}

class Root extends Component {
  constructor(props) {
    super(props)
    this.control = props.control.setView(this)
    this.state = this.control.model.getReactState()
    this.control.update()
    window.addEventListener('resize', this.onWindowResize.bind(this))
    this.theme = {
      isDark: true,
      light: ['whitesmoke', 'black', 'rgba(0, 0, 0, 0.5)'],
      dark: ['#282c34', '#dfdfdf', 'rgba(169, 169, 225, 0.5)'],
    }
  }

  setStatePostPromiseResolution(promise) {
    promise.then((s) => this.setState(s))
  }

  getDims() {
    let root = document.getElementById('root')
    let width = root.getBoundingClientRect().width
    let height = root.getBoundingClientRect().height
    return [width, height]
  }

  onWindowResize() {
    this.setState(this.state)
  }

  separateUnits(str) {
    let unit = str.endsWith('mph') ? 'mph' : 'km/h'
    return [str.slice(0, str.length - unit.length - 1), unit]
  }

  cleanLink(url) {
    let ret = ''
    let toCopy = true
    for (let i = 0; i < url.length; i++) {
      if (url[i] === ',') toCopy = false
      if (url[i] === '/') toCopy = true
      if (toCopy) ret += url[i]
      if (url[i] === '?') break
    }
    return ret
  }

  now() {
    let now = this.state.now
    let url = this.cleanLink(now.icon).replace('size=medium', 'size=large')
    return (
      <Fragment>
        <p id="text-description">{now.textDescription}</p>
        <p id="temperature">
          {Math.round(now.temperature)}
          <sup>&deg;{now.temperatureUnit}</sup>
        </p>
        <img src={url} title={now.textDescription} alt={now.textDescription} />
        <table>
          <tbody>
            <tr>
              <td className="key">Page Update</td>
              <td>
                {now.lastUpdate.toLocaleString(this.state.locale, nowDateFmt)}
              </td>
            </tr>
            <tr>
              <td className="key">Data Recorded</td>
              <td>
                {now.timestamp.toLocaleString(this.state.locale, nowDateFmt)}
              </td>
            </tr>
            <tr>
              <td className="key">Latitude</td>
              <td>{now.latitude.toFixed(1)}</td>
            </tr>
            <tr>
              <td className="key">Longitude</td>
              <td>{now.longitude.toFixed(1)}</td>
            </tr>
            <tr>
              <td className="key">Elevation</td>
              <td>{now.elevation}</td>
            </tr>
            <tr>
              <td className="key">Wind</td>
              <td>
                {now.windSpeed} {now.windDirection}&deg;
              </td>
            </tr>
            <tr>
              <td className="key">Area</td>
              <td>
                {now.city}, {now.state}
              </td>
            </tr>
            <tr>
              <td className="key">NWS Zone</td>
              <td>{now.zone}</td>
            </tr>
            <tr>
              <td className="key">NWS County</td>
              <td>{now.county}</td>
            </tr>
            <tr>
              <td className="key">NWS Station ID</td>
              <td>{now.stationId}</td>
            </tr>
            <tr>
              <td className="key">NWS Station</td>
              <td>{now.stationName}</td>
            </tr>
          </tbody>
        </table>
      </Fragment>
    )
  }

  alerts() {
    let ret = new Array(this.state.alerts.features.length)
    let cur = null
    for (let i = 0; i < ret.length; i++) {
      cur = this.state.alerts.features[i].properties
      ret[i] = (
        <div key={i} className="individual-alert">
          <p>{cur.severity} {cur.messageType}</p>
          <details>
            <summary>{cur.headline}</summary>
            <p className="hidden">{cur.instruction}.</p>
          </details>
        </div>
      )
    }
    return (
      <div id="alerts">
        <p>{this.state.alerts.title}</p>
        {ret}
      </div>
    )
  }

  tabulate() {
    let ls = this.state.hours
    let ret = new Array(6 * 2).fill().map((_) => new Array(14))
    for (let i = 0; i < ret.length; i++) {
      if (i > 5) ls = this.state.days
      for (let j = 0; j < ret[i].length; j++) {
        if (i == 0) {
          ret[i][j] = new Date(ls[j].startTime).toLocaleString(
            this.state.locale,
            forecastDayFmt
          )
        } else if (i == 6) {
          ret[i][j] = ls[j].name
        } else if (i == 1) {
          ret[i][j] = new Date(ls[j].startTime).toLocaleString(
            this.state.locale,
            forecastHourFmt
          )
        } else if (i == 7) {
          ret[i][j] = new Date(ls[j].startTime)
            .toLocaleString(this.state.locale, dailyDateFmt)
            .split(' ')
            .reverse()
            .join(' ')
        } else if (i == 2 || i == 8) {
          ret[i][j] = [ls[j].temperature, ls[j].temperatureUnit]
        } else if (i == 3 || i == 9) {
          ret[i][j] = [this.cleanLink(ls[j].icon), ls[j].shortForecast]
        } else if (i == 4 || i == 10) {
          ret[i][j] = this.separateUnits(ls[j].windSpeed)
        } else {
          let rain = ls[j].probabilityOfPrecipitation.value
          ret[i][j] = rain ? rain : null
        }
      }
    }
    return ret
  }

  addHtml(arr) {
    for (let i = 0; i < arr.length; i++)
      for (let j = 0; j < arr[i].length; j++) {
        if (i == 0 || i == 6) {
          let tk = arr[i][j].split(' ')
          tk[0] = tk[0].endsWith('day') ? tk[0].slice(0, 3) : tk[0]
          arr[i][j] = tk.map((t, i) => <p key={i}>{t}</p>)
        } else if (i == 1 || i == 7) {
          arr[i][j] = <p>{arr[i][j]}</p>
        } else if (i == 2 || i == 8) {
          arr[i][j] = (
            <p>
              {arr[i][j][0]}
              <sup>&deg;{arr[i][j][1]}</sup>
            </p>
          )
        } else if (i == 3 || i == 9) {
          arr[i][j] = (
            <img src={arr[i][j][0]} title={arr[i][j][1]} alt={arr[i][j][1]} />
          )
        } else if (i == 4 || i == 10) {
          arr[i][j] = (
            <p>
              {arr[i][j][0]}
              <br />
              <small>{arr[i][j][1]}</small>
            </p>
          )
        } else {
          arr[i][j] = <p>{arr[i][j] ? `${arr[i][j]}%` : null}</p>
        }
      }
    return arr
  }

  populateTable(arr, key = 1) {
    for (let i = 0; i < arr.length; i++)
      for (let j = 0; j < arr[i].length; j++)
        arr[i][j] = <td key={`${i}${j}`}>{arr[i][j]}</td>
    for (let i = 0; i < arr.length; i++)
      if (i == 6)
        arr[i] = (
          <tr key={i} id="middle">
            {arr[i]}
          </tr>
        )
      else arr[i] = <tr key={i}>{arr[i]}</tr>
    return (
      <table key={key}>
        <tbody>{arr}</tbody>
      </table>
    )
  }

  transpose(table) {
    let rows = table[0].length
    let columns = table.length
    let ret = new Array(rows).fill().map((_) => new Array(columns))
    for (let i = 0; i < table.length; i++)
      for (let j = 0; j < table[i].length; j++) ret[j][i] = table[i][j]
    return ret
  }

  forecast() {
    let [w, h] = this.getDims()
    let table = this.addHtml(this.tabulate())
    if (w <= 850) {
      let hours = this.transpose(table.slice(0, 6))
      hours = this.populateTable(hours, 1)
      let days = this.transpose(table.slice(6, 12))
      days = this.populateTable(days, 2)
      return [hours, days]
    }
    return this.populateTable(table)
  }

  changeTheme() {
    let r = document.querySelector(':root')
    if (this.theme.isDark) {
      r.style.setProperty('--BG', this.theme.light[0])
      r.style.setProperty('--FG', this.theme.light[1])
      r.style.setProperty('--BR', this.theme.light[2])
      this.theme.isDark = false
    } else {
      r.style.setProperty('--BG', this.theme.dark[0])
      r.style.setProperty('--FG', this.theme.dark[1])
      r.style.setProperty('--BR', this.theme.dark[2])
      this.theme.isDark = true
    }
  }

  render() {
    if (!this.state.now) return <p id="wait">{this.state.waitMessage}</p>
    console.log(this.state.alerts)
    return (
      <Fragment>
        <main>
          <div id="first">{this.now()}</div>
          <div id="second">
            {this.forecast()}
            {this.state.alerts.features.length ? this.alerts() : null}
          </div>
        </main>
        <footer>
          <div>
            <p>We don't store your data.</p>
          </div>
          <div>
            <label className={'toggle'}>
              <input
                className={'toggle-checkbox'}
                type="checkbox"
                onChange={this.control.flipUnits}
              />
              <div className={'toggle-switch'}></div>
              <span className={'toggle-label'}>Freedom Units</span>
            </label>
            <label className={'toggle'}>
              <input
                className={'toggle-checkbox'}
                type="checkbox"
                onChange={this.changeTheme.bind(this)}
              />
              <div className={'toggle-switch'}></div>
              <span className={'toggle-label'}>Day Theme</span>
            </label>
          </div>
        </footer>
      </Fragment>
    )
  }
}

export default Root
