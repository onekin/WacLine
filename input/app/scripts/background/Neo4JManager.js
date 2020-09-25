import ChromeStorage from '../utils/ChromeStorage'

class Neo4JManager {
  init () {
    this.initResponser()
  }

  initResponser () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'neo4j') {
        if (request.cmd === 'getCredentials') {
          ChromeStorage.getData('neo4j.credentials', ChromeStorage.sync, (err, credentials) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (credentials) {
                const parsedCredentials = JSON.parse(credentials.data)
                sendResponse({ credentials: parsedCredentials || {} })
              } else {
                sendResponse({ credentials: {} })
              }
            }
          })
        } else if (request.cmd === 'setCredentials') {
          const credentials = request.data.credentials
          ChromeStorage.setData('neo4j.credentials', { data: JSON.stringify(credentials) }, ChromeStorage.sync, (err) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              sendResponse({ credentials: credentials })
            }
          })
        }
      }
    })
  }
}

export default Neo4JManager
