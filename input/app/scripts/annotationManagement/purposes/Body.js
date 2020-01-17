class Body {
  constructor (purpose) {
    this.purpose = purpose
  }

  populate (data) {
    this.data = data
  }

  serialize () {
    let obj = JSON.parse(JSON.stringify(this.data))
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
