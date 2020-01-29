const Events = require('../../../../Events')
const Codebook = require('../../../model/Codebook')
const Alerts = require('../../../../utils/Alerts')
const LanguageUtils = require('../../../../utils/LanguageUtils')

class EmptyCodebook {
  static createDefaultAnnotations () {
    Codebook.setAnnotationServer(null, (annotationServer) => {
      let emptyCodebook = new Codebook({annotationServer: annotationServer})
      let emptyCodebookAnnotation = emptyCodebook.toAnnotation()
      window.abwa.annotationServerManager.client.createNewAnnotation(emptyCodebookAnnotation, (err, annotation) => {
        if (err) {
          Alerts.errorAlert({text: 'Unable to create required configuration for Dynamic highlighter. Please, try it again.'}) // TODO i18n
        } else {
          // Open the sidebar, to notify user that the annotator is correctly created
          window.abwa.sidebar.openSidebar()
          LanguageUtils.dispatchCustomEvent(Events.codebookCreated, {annotations: annotation})
        }
      })
    })
  }
}

module.exports = EmptyCodebook
