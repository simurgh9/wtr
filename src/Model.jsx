const ROOT = 'https://api.weather.gov/'
const DEFAULT_CORDS = [33.7878, -117.8531]
class Model {
  constructor() {
    this.state = {
      waitMessage: "We don't keep any of your data and have no backend.",
      lastUpdate: null,
      latitude: null,
      elevation: null,
      longitude: null,
      locale: 'en-US',
      units: 'si',
      city: null,
      state: null,
      county: null,
      zone: null,
      station: null,
      now: null,
      hours: null,
      days: null,
      alerts: null,
    }
  }

  update() {
    return this.latilongi().then(this.makeGetCalls.bind(this))
  }

  makeGetCalls(position) {
    let url = `${ROOT}points/${position[0]},${position[1]}`
    this.setReactState({
      now: {
        latitude: position[0],
        longitude: position[1],
      },
    })
    return this.bring(url).then(this.points.bind(this))
  }

  points(json) {
    let pr = json.properties
    let zone = pr.forecastZone
    let [x, y] = [pr.gridX, pr.gridY]
    this.state.now.city = pr.relativeLocation.properties.city
    this.state.now.state = pr.relativeLocation.properties.state
    this.state.now.zone = zone.substring(zone.lastIndexOf('/') + 1)
    this.state.now.county = pr.county.substring(pr.county.lastIndexOf('/') + 1)
    let promises = [
      this.now(`${ROOT}gridpoints/${pr.gridId}/${x},${y}/stations`),
      this.days(`${pr.forecast}?units=${this.state.units}`),
      this.hours(`${pr.forecastHourly}?units=${this.state.units}`),
      this.alerts(`${ROOT}alerts/active?zone=${this.state.now.zone}`),
    ]
    return Promise.all(promises).then((states) => states[0])
  }

  now(url) {
    return this.bring(url).then((j) => {
      let idx = 0
      return Promise.all([
        this.bring(`${j.observationStations[idx]}/observations/latest`).then(
          (j) => {
            this.state.now.textDescription = j.properties.textDescription
            this.state.now.temperature = j.properties.temperature.value
            this.state.now.temperatureUnit = 'C'
            this.state.now.icon = j.properties.icon
            this.state.now.lastUpdate = new Date()
            this.state.now.timestamp = new Date(j.properties.timestamp)
            this.state.now.elevation = `${j.properties.elevation.value} metres`
            this.state.now.windSpeed = `${j.properties.windSpeed.value} km/h`
            this.state.now.windDirection = j.properties.windDirection.value
            return this.state
          }
        ),
        this.bring(`${j.observationStations[idx]}`).then((j) => {
          this.state.now.stationName = j.properties.name
          this.state.now.stationId = j.properties.stationIdentifier
          return this.state
        }),
      ]).then((states) => states[0])
    })
  }

  days(url) {
    return this.bring(url).then((j) =>
      this.setReactState({
        days: j.properties.periods,
      })
    )
  }

  hours(url) {
    return this.bring(url).then((j) =>
      this.setReactState({
        hours: this.clipPast(j.properties.periods),
      })
    )
  }

  alerts(url) {
    return this.bring(url).then((j) =>
      this.setReactState({
        alerts: j,
      })
    )
  }

  clipPast(hours) {
    let now = new Date()
    let i
    for (i = 0; i < hours.length; i++) {
      let hoursPast = (new Date(hours[i].startTime) - now) / (1000 * 60 * 60)
      if (hoursPast > -1) break
    }
    return hours.slice(i, hours.length)
  }

  bring(url) {
    const options = {
      method: 'GET',
      headers: new Headers({ 'User-Agent': 'Mozilla/5.0' }),
      mode: 'no-cors',
    }
    return fetch(url)
      .then((r) => r.json())
      .then((j) => j)
      .catch((error) => error.message)
  }

  latilongi() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve([position.coords.latitude, position.coords.longitude])
        },
        (error) => {
          console.log(error)
          return resolve(DEFAULT_CORDS)
        },
        {
          enableHighAccuracy: true,
          timeout: 60 * 1000, // 60 seconds
          maximumAge: 1000,
        }
      )
    })
  }

  toggleUnits() {
    let temp = null
    let speed = null
    let distance = null
    if (this.state.units === 'si') {
      this.state.units = 'us'
      temp = 'F'
      speed = 'mph'
      distance = 'feet'
    } else {
      this.state.units = 'si'
      temp = 'C'
      speed = 'km/h'
      distance = 'metres'
    }
    let cur = null
    let wind = null

    for (let k of ['hours', 'days']) {
      for (let i = 0; i < this.state[k].length; i++) {
        cur = this.state[k][i]
        cur.temperature = Math.round(this.convertTo(cur.temperature, temp))
        cur.temperatureUnit = temp
        cur.windSpeed = this.convertRangeUnits(cur.windSpeed, speed)
      }
    }
    cur = this.state.now
    cur.temperature = Math.round(this.convertTo(cur.temperature, temp))
    cur.temperatureUnit = temp
    cur.windSpeed = this.convertRangeUnits(cur.windSpeed, speed)
    this.state.now.elevation = this.convertRangeUnits(
      this.state.now.elevation,
      distance
    )
    return this.getReactState()
  }

  convertRangeUnits(value, unit) {
    let arr = this.separateUnits(value)
    if (arr[0].includes('to')) {
      let [from, to] = arr[0].split(' to ').map(Number)
      from = Math.round(this.convertTo(from, unit))
      to = Math.round(this.convertTo(to, unit))
      value = `${from} to ${to} ${unit}`
    } else {
      value = `${Math.round(this.convertTo(Number(arr[0]), unit))} ${unit}`
    }
    return value
  }

  convertTo(x, unit) {
    let ret = null
    switch (unit) {
      case 'feet':
        ret = 3.280839895 * x
        break
      case 'metres':
        ret = x / 3.280839895
        break
      case 'mph':
        ret = 0.621371 * x
        break
      case 'km/h':
        ret = x / 0.621371
        break
      case 'F': // from celcius
        ret = (9 / 5) * x + 32
        break
      case 'C': // from fahrenheit
        ret = (5 / 9) * (x - 32)
        break
    }
    return ret
  }

  separateUnits(str) {
    let unit = null
    if (str.endsWith('mph')) {
      unit = 'mph'
    } else if (str.endsWith('km/h')) {
      unit = 'km/h'
    } else if (str.endsWith('metres')) {
      unit = 'metres'
    } else if (str.endsWith('feet')) {
      unit = 'feet'
    }
    return [str.slice(0, str.length - unit.length - 1), unit]
  }

  getReactState() {
    return this.state
  }

  setReactState(changes) {
    Object.assign(this.state, changes)
    return this.state
  }
}

export default Model
