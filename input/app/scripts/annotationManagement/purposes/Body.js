class Body {
  constructor (purpose) {
    this.purpose = purpose
  }

  populate (value) {
    this.value = value
  }

  serialize () {
    let obj = JSON.parse(JSON.stringify(this.value))
    obj['purpose'] = this.purpose
    return obj
  }

  static deserialize (obj) {
    return new Body(obj.purpose)
  }

  tooltip () {
    return ''
  }
}

module.exports = Body
