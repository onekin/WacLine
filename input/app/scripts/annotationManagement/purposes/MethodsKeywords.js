import Body from './Body'

class MethodsKeywords extends Body {
  constructor ({
    purpose = MethodsKeywords.purpose,
    value
  }) {
    super(purpose)
    this.value = value
  }

  populate (value) {
    super.populate(value)
  }

  serialize () {
    return super.serialize()
  }

  static deserialize (obj) {
    let check = new MethodsKeywords({ value: obj.value })
    return check
  }

  tooltip () {
    return 'MethodsKeywords:'
  }
}

MethodsKeywords.purpose = 'methodsKeywords'

export default MethodsKeywords
