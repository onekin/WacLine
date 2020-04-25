const URL = require('./URL')
const Config = require('../../../Config')

class ToolURL extends URL {
  constructor ({name, annotation}) {
    super({name, annotation})
    this.direction = annotation.target[0].source.url + '#' + Config.namespace + ':' + annotation.id
    this.content = '[InternetShortcut]\n' +
      'URL=' + this.direction
  }
}

module.exports = ToolURL
