class Control {
  constructor(model) {
    this.model = model
  }

  setView(view) {
    this.view = view
    return this
  }

  update = () => {
    this.view.setStatePostPromiseResolution(this.model.update())
  }

  flipUnits = () => {
    this.view.setState(this.model.toggleUnits())
  }
}

export default Control
