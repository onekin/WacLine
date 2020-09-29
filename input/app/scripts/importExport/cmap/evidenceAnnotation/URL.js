class URL {
  constructor ({ elementID, name, annotation }) {
    this.id = ''
    this.parentId = elementID
    this.name = name
    this.direction = annotation.target[0].source.url
    this.content = '[InternetShortcut]\n' +
      'URL=' + this.direction
  }
}

module.exports = URL
