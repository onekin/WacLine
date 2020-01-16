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

  tooltip () {
    return ''
  }
}

module.exports = Body
