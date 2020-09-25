import Body from './Body'

class Commenting extends Body {
  constructor ({ purpose = Commenting.purpose, value }) {
    super(purpose)
    this.value = value
  }

  populate (text) {
    super.populate(text)
  }

  serialize () {
    return super.serialize()
  }

  tooltip () {
    return 'Comment: ' + this.value
  }
}

Commenting.purpose = 'commenting'

export default Commenting
