const Config = require('../Config')
const UserDefinedHighlighterDefinition = require('./UserDefinedHighlighterDefinition')
const AnnotationGuide = require('./AnnotationGuide')

class DefaultHighlighterGenerator {
  static createApplicationBasedGroup (callback) {
    window.abwa.hypothesisClientManager.hypothesisClient.createNewGroup({name: Config.groupName}, callback)
  }

  static createDefaultAnnotations (storage, callback) {
    // Create annotation guide from user defined highlighter definition
    let annotationGuide = AnnotationGuide.fromUserDefinedHighlighterDefinition(UserDefinedHighlighterDefinition)
    // Create review schema from default criterias
    annotationGuide.storage = storage
    // Create highlighter annotations
    let annotations = annotationGuide.toAnnotations()
    // TODO Codes annotations should be related to its corresponding theme: it requires to update Code annotations to relate them by ID instead of by tag
    // Send create highlighter
    window.abwa.hypothesisClientManager.hypothesisClient.createNewAnnotations(annotations, (err, annotations) => {
      callback(err, annotations)
    })
  }
}

module.exports = DefaultHighlighterGenerator
