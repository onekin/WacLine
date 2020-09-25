class Body {
  constructor (purpose) {
    this.purpose = purpose
  }

  populate (value) {
    this.value = value
  }

  serialize () {
    return { purpose: this.purpose, value: this.value }
  }

  static deserialize (obj) {
    return new Body(obj.purpose)
  }

  tooltip () {
    return ''
  }
}

export default Body
