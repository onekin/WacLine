import Body from './Body'

class Assessing extends Body {
  constructor ({ purpose = Assessing.purpose, value }) {
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
    return new Assessing({ value: obj.value })
  }

  tooltip () {
    if (this.value) {
      return 'Assessing: ' + this.value
    } else {
      return ''
    }
  }
}

Assessing.purpose = 'assessing'

export default Assessing
