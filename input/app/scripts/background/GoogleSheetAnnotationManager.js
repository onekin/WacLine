import GoogleSheetAnnotationClientManager from '../annotationServer/googleSheetAnnotationServer/GoogleSheetAnnotationClientManager'
import GoogleSheetAnnotationBackgroundManager from '../annotationServer/googleSheetAnnotationServer/GoogleSheetAnnotationBackgroundManager'

class GoogleSheetAnnotationManager {
  constructor () {
    // Define token
    this.token = null
    // Hypothesis oauth manager
    this.hypothesisManagerOAuth = null
  }

  init () {
    this.initGoogleSheetAnnotationClientManager()
    // Init google sheet annotation background manager, who listens to commands from contentScript
    this.initGoogleSheetAnnotationBackgroundManager()
  }

  initGoogleSheetAnnotationClientManager () {
    this.annotationServerManager = new GoogleSheetAnnotationClientManager()
    this.annotationServerManager.init((err) => {
      if (err) {
        console.debug('Unable to initialize google sheet annotation client manager. Error: ' + err.message)
      }
    })
  }

  initGoogleSheetAnnotationBackgroundManager () {
    this.googleSheetAnnotationBackgroundManager = new GoogleSheetAnnotationBackgroundManager()
    this.googleSheetAnnotationBackgroundManager.init()
  }
}

export default GoogleSheetAnnotationManager
