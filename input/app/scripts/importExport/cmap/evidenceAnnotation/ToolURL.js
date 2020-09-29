const URL = require('./URL')
const Config = require('../../../Config')

class ToolURL extends URL {
  constructor ({ elementID, name, annotation }) {
    super({ elementID, name, annotation })
    this.direction = annotation.target[0].source.url + '#' + Config.namespace + ':' + annotation.id
    this.content = '[InternetShortcut]\n' +
      'URL=' + this.direction
  }
}

module.exports = ToolURL
