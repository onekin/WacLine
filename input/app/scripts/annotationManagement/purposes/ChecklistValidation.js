import Body from './Body'

class ChecklistValidation extends Body {
  constructor ({
    purpose = ChecklistValidation.purpose,
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
    let check = new ChecklistValidation({ value: obj.value })
    return check
  }

  tooltip () {
    return 'ChecklistValidation'
  }

  toString () {
    let str = '\t--' + this.value.name + '--\n'
    this.value.definition.forEach((group) => {
      str += '\n\t' + group.name + ':\n'
      group.codes.sort((a, b) => {
        if (a.status === 'passed') return -1
        if (b.status === 'passed') return 1
        if (a.status === 'failed') return -1
        if (b.status === 'failed') return 1
        return 0
      })
      group.codes.forEach((code) => {
        let status = ''
        if (code.status === 'passed') {
          status = '✓'
        } else if (code.status === 'failed') {
          status = 'X'
        } else {
          status = '?'
        }
        str += '\t [' + status + ']-' + code.name + '\n'
      })
    })
    return str
  }
}

ChecklistValidation.purpose = 'validation'

export default ChecklistValidation
