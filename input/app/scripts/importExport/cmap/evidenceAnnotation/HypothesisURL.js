import URL from './URL'

class HypothesisURL extends URL {
  constructor ({ elementID, name, annotation }) {
    super({ elementID, name, annotation })
    this.direction = annotation.target[0].source.url + '#annotations:' + annotation.id
    this.content = '[InternetShortcut]\n' +
      'URL=' + this.direction
  }
}

export default HypothesisURL
