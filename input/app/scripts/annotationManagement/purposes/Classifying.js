const Body = require('./Body')

class Classifying extends Body {
  constructor ({purpose = 'classifying', code}) {
    super(purpose)
    this.data = code.toObject()
  }

  populate (code) {
    super.populate(code)
  }

  serialize () {
    return super.serialize()
  }

  tooltip () {
    // PVSCL:IFCOND(Hierarchy, LINE)
    // TODO
    // PVSCL:ENDCOND
  }
}

module.exports = Classifying
