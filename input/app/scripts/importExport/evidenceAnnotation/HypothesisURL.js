const URL = require('./URL')

class ToolURL extends URL {
  constructor () {
    super()
    this.name = {}
    this.direction = 'https://localannotationsdatabase.org'
    this.content = this.name
  }
}

module.exports = ToolURL
