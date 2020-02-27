const PredefinedScheme = require('./PredefinedScheme')
const Codebook = require('../../../model/Codebook')
const Alerts = require('../../../../utils/Alerts')
const _ = require('lodash')

class BuiltIn {
  static createDefaultAnnotations (callback) {
    Codebook.setAnnotationServer(null, (annotationServer) => {
      // Create annotation guide from user defined highlighter definition
      let annotationGuide = Codebook.fromObjects(PredefinedScheme)
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
          if (_.isFunction(callback)) {
            callback(null, annotations)
          }
        }
      })
    })
  }
}

module.exports = BuiltIn
