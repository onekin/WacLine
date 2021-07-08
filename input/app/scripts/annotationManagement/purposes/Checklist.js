import ChecklistReview from '../read/ChecklistReview'
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

}

Checklist.purpose = 'checklist'

export default Checklist
