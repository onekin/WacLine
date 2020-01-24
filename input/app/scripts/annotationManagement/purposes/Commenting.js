const Body = require('./Body')

class Commenting extends Body {
  constructor ({purpose = 'commenting', value}) {
    super(purpose)
    this.value = value
  }

  populate (code) {
    super.populate(code)
  }

  serialize () {
    return super.serialize()
  }

  tooltip () {
    return 'Comment: ' + this.value
  }
}

module.exports = Commenting
