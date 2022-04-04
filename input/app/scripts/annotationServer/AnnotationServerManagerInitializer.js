import _ from 'lodash'

class AnnotationServerManagerInitializer {
  static init (callback) {
    let annotationServerManager
    // PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren('ps:annotationServer')->pv:Size()=1, LINE)
    // PVSCL:IFCOND(Hypothesis, LINE)
    const HypothesisClientManager = require('./hypothesis/HypothesisClientManager').default
    annotationServerManager = new HypothesisClientManager()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(BrowserStorage, LINE)
    const BrowserStorageManager = require('./browserStorage/BrowserStorageManager').default
    annotationServerManager = new BrowserStorageManager()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(GoogleSheetAnnotationServer, LINE)
    const GoogleSheetAnnotationClientManager = require('./googleSheetAnnotationServer/GoogleSheetAnnotationClientManager').default
    annotationServerManager = new GoogleSheetAnnotationClientManager()
    // PVSCL:ENDCOND
    if (_.isFunction(callback)) {
      callback(null, annotationServerManager)
    }
    // PVSCL:ELSECOND
    // More than one annotation servers are selected, retrieve the current selected one
    chrome.runtime.sendMessage({ scope: 'annotationServer', cmd: 'getSelectedAnnotationServer' }, ({ annotationServer }) => {
      // PVSCL:IFCOND(Hypothesis, LINE)
      if (annotationServer === 'hypothesis') {
        // Hypothesis
        const HypothesisClientManager = require('../annotationServer/hypothesis/HypothesisClientManager').default
        annotationServerManager = new HypothesisClientManager()
      }
      // PVSCL:ENDCOND// sass-lint:disable no-important
      // PVSCL:IFCOND(BrowserStorage, LINE)
      if (annotationServer === 'browserstorage') {
        // Browser storage
        annotationServerManager = new BrowserStorageManager()
      }
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(Neo4J, LINE)
      if (annotationServer === 'neo4j') {
        // Browser storage
        const Neo4JClientManager = require('../annotationServer/neo4j/Neo4JClientManager').default
        annotationServerManager = new Neo4JClientManager()
      }
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(GoogleSheetAnnotationServer, LINE)
      if (annotationServer === 'googlesheetannotationserver') {
        // Browser storage
        const GoogleSheetAnnotationClientManager = require('../annotationServer/googleSheetAnnotationServer/GoogleSheetAnnotationClientManager').default
        annotationServerManager = new GoogleSheetAnnotationClientManager()
      }
      // PVSCL:ENDCOND
      if (_.isFunction(callback)) {
        callback(null, annotationServerManager)
      }
    })
    // PVSCL:ENDCOND
  }
}

export default AnnotationServerManagerInitializer
