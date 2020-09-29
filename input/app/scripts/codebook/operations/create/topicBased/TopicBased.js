import _ from 'lodash'
import Alerts from '../../../../utils/Alerts'
import Codebook from '../../../model/Codebook'

class TopicBased {
  static createDefaultAnnotations (topic, callback) {
    Codebook.setAnnotationServer(null, (annotationServer) => {
      // Create annotation guide from user defined topic
      let annotationGuide = Codebook.fromTopic(topic)
      annotationGuide.annotationServer = annotationServer
      let annotations = annotationGuide.toAnnotations()
      window.abwa.annotationServerManager.client.createNewAnnotations(annotations, (err, newAnnotations) => {
        if (err) {
          Alerts.errorAlert({ text: 'Unable to create required configuration for Dynamic highlighter. Please, try it again.' }) // TODO i18n
        } else {
          // Open the sidebar, to notify user that the annotator is correctly created
          window.abwa.sidebar.openSidebar()
          if (_.isFunction(callback)) {
            callback(null, newAnnotations)
          }
        }
      })
    })
  }
}

export default TopicBased
