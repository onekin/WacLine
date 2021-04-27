import Body from './Body'

class Report extends Body {
  constructor ({
    purpose = Report.purpose,
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
    return new Report({ value: obj.value })
  }

  tooltip () {
    return 'Report:'
  }
}

Report.purpose = 'report'

export default Report
