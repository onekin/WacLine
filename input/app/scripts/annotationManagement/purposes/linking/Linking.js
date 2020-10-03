import Body from '../Body'

class Linking extends Body {
  constructor ({ purpose = Linking.purpose, value }) {
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
    let from = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(obj.from)
    let to = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(obj.to)
    let linkingWord = obj.linkingWord
    return new Linking({ from, to, linkingWord })
  }

  tooltip () {
    let from = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(this.value.from)
    let to = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(this.value.to)
    if (from && to) {
      return 'Linking: ' + from.name + ' ' + this.value.linkingWord + ' ' + to.name
    }
  }
}

Linking.purpose = 'linking'

export default Linking
