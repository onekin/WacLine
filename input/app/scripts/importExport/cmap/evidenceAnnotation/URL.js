class URL {
  constructor ({ elementID, name, annotation }) {
    this.id = ''
    this.parentId = elementID
    this.name = name.replace('&', 'And')
    this.direction = annotation.target[0].source.url
    this.content = '[InternetShortcut]\n' +
      'URL=' + this.direction
  }
}

export default URL
