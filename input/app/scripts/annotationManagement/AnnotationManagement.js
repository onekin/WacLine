const ReadAnnotation = require('./read/ReadAnnotation')
const CreateAnnotation = require('./create/CreateAnnotation')
const UpdateAnnotation = require('./UpdateAnnotation')
const DeleteAnnotation = require('./DeleteAnnotation')

class AnnotationManagement {
  constructor () {
    this.annotationCreator = new CreateAnnotation()
    this.annotationReader = new ReadAnnotation()
    this.annotationUpdater = new UpdateAnnotation()
    this.annotationDeleter = new DeleteAnnotation()
  }

  init (callback) {
    this.annotationCreator.init()
    this.annotationReader.init()
    this.annotationUpdater.init()
    this.annotationDeleter.init()
  }

  destroy () {

  }
}

module.exports = AnnotationManagement
