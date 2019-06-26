const Storage = require('../Storage')

class Local extends Storage {
  constructor ({group}) {
    super({group})
  }
}

module.exports = Local
