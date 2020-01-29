const UserDefinedHighlighterDefinition = require('./UserDefinedHighlighterDefinition')
const Codebook = require('../../../model/Codebook')
const Alerts = require('../../../../utils/Alerts')
const LanguageUtils = require('../../../../utils/LanguageUtils')
const Events = require('../../../../Events')

class BuiltIn {
  static createDefaultAnnotations () {
    Codebook.setAnnotationServer(null, (annotationServer) => {
      // Create annotation guide from user defined highlighter definition
      let annotationGuide = Codebook.fromUserDefinedHighlighterDefinition(UserDefinedHighlighterDefinition)
      // Create review schema from default criterias
      annotationGuide.annotationServer = annotationServer
      // Create highlighter annotations
      let annotations = annotationGuide.toAnnotations()
      // TODO Codes annotations should be related to its corresponding theme: it requires to update Code annotations to relate them by ID instead of by tag
      // Send create highlighter
      window.abwa.annotationServerManager.client.createNewAnnotations(annotations, (err, annotations) => {
        if (err) {
          Alerts.errorAlert({text: 'Unable to create new group.'})
        } else {
          window.abwa.sidebar.openSidebar()
          Alerts.closeAlert()
          LanguageUtils.dispatchCustomEvent(Events.codebookCreated, {annotations: annotations})
        }
      })
    })
  }
}

module.exports = BuiltIn
