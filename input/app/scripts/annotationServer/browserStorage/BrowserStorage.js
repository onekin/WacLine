const AnnotationServer = require('../AnnotationServer')

class BrowserStorage extends AnnotationServer {
  constructor ({group}) {
    super({group})
  }
}

module.exports = BrowserStorage
