class URL {
  constructor ({name, annotation}) {
    this.name = name
    this.direction = annotation.target[0].source.url
    this.content = '[InternetShortcut]\n' +
      'URL=' + this.direction
  }
}

module.exports = URL
