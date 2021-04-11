import Body from './Body'

class Describing extends Body {
  constructor ({
    purpose = Describing.purpose,
    value
  }) {
    super(purpose)
    this.value = value
  }

  populate (code) {
    super.populate(code)
  }

  serialize () {
    return super.serialize()
  }

  static deserialize (obj) {
    return new Describing({
      value: obj.value
    })
  }

  tooltip () {
    return 'Describing: ' + this.value.acronym + '-' + this.value.name
  }
}

Describing.purpose = 'describing'

export default Describing
