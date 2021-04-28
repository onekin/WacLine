import Body from './Body'

class Checklist extends Body {
  constructor ({
    purpose = Checklist.purpose,
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
    let check = new Checklist({ value: obj.value })
    return check
  }

  tooltip () {
    return 'Checklist: ' + this.value.name
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
        str += '\t-' + code.name + ' -> ' + code.status + '\n'
      })
    })
    return str
  }
}

Checklist.purpose = 'checklist'

export default Checklist
