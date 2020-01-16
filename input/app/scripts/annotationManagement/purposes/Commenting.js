const Body = require('./Body')

class Commenting extends Body {
  constructor ({purpose = 'commenting', value}) {
    super(purpose)
    this.data = value
  }

  populate (code) {
    super.populate(code)
  }

  serialize () {
    return super.serialize()
  }

  tooltip () {
    return this.data
  }
}

module.exports = Commenting
