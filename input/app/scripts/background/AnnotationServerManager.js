const ChromeStorage = require('../utils/ChromeStorage')
const Config = require('../Config')

class AnnotationServerManager {
  init () {
    // Initialize replier for requests related to annotationServer
    this.initResponsers()
  }

  initResponsers () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'annotationServer') {
        if (request.cmd === 'getSelectedAnnotationServer') {
          ChromeStorage.getData('annotationServer.selected', ChromeStorage.sync, (err, annotationServer) => {
            if (err) {
              sendResponse({err: err})
            } else {
              if (annotationServer) {
                let parsedAnnotationServer = JSON.parse(annotationServer.data)
                sendResponse({annotationServer: parsedAnnotationServer || ''})
              } else {
                let defaultAnnotationServer = Config.defaultAnnotationServer
                sendResponse({annotationServer: defaultAnnotationServer})
              }
            }
          })
        } else if (request.cmd === 'setSelectedAnnotationServer') {
          let selectedAnnotationServer = request.data.annotationServer
          ChromeStorage.setData('annotationServer.selected', {data: JSON.stringify(selectedAnnotationServer)}, ChromeStorage.sync, (err) => {
            if (err) {
              sendResponse({err: err})
            } else {
              sendResponse({annotationServer: selectedAnnotationServer})
            }
          })
        }
      }
    })
  }
}

module.exports = AnnotationServerManager
