import Body from './Body'

class SuggestingLiterature extends Body {
  constructor ({ purpose = SuggestingLiterature.purpose, value = [] }) {
    super(purpose)
    this.value = value
  }

  populate (value) {
    super.populate(value)
  }

  serialize () {
    return super.serialize()
  }

  tooltip () {
    return 'Suggested literature: \n ' + this.value.join('\n ')
  }
}

SuggestingLiterature.purpose = 'suggestingLiterature'

export default SuggestingLiterature
