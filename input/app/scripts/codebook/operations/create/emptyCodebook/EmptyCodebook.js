const UserDefinedHighlighterDefinition = require('./UserDefinedHighlighterDefinition')
const Codebook = require('../../../model/Codebook')
const Alerts = require('../../../../utils/Alerts')
const LanguageUtils = require('../../../../utils/LanguageUtils')

class BuiltIn {
  static createDefaultAnnotations (annotationServer, callback) {
    // Create annotation guide from user defined highlighter definition
    let annotationGuide = Codebook.fromUserDefinedHighlighterDefinition(UserDefinedHighlighterDefinition)
    // Create review schema from default criterias
    annotationGuide.annotationServer = annotationServer
    // Create highlighter annotations
    let annotations = annotationGuide.toAnnotations()
    // TODO Codes annotations should be related to its corresponding theme: it requires to update Code annotations to relate them by ID instead of by tag
    // Send create highlighter
    window.abwa.annotationServerManager.client.createNewAnnotations(annotations, (err, annotations) => {
      window.abwa.sidebar.openSidebar()
      Alerts.closeAlert()
      LanguageUtils.dispatchCustomEvent(Event.codebookCreated, {annotations: annotations})
    })
  }
}

module.exports = BuiltIn
