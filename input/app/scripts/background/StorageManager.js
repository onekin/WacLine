const ChromeStorage = require('../utils/ChromeStorage')

class StorageManager {
  init () {
    // Initialize replier for requests related to storage
    this.initResponsers()
  }

  initResponsers () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'storage') {
        if (request.cmd === 'getSelectedStorage') {
          ChromeStorage.getData('storage.selected', ChromeStorage.sync, (err, storage) => {
            if (err) {
              sendResponse({err: err})
            } else {
              if (storage) {
                let parsedStorage = JSON.parse(storage.data)
                sendResponse({storage: parsedStorage || ''})
              } else {
                sendResponse({storage: ''})
              }
            }
          })
        } else if (request.cmd === 'setSelectedStorage') {
          let selectedStorage = request.data.storage
          ChromeStorage.setData('storage.selected', {data: JSON.stringify(selectedStorage)}, ChromeStorage.sync, (err) => {
            if (err) {
              sendResponse({err: err})
            } else {
              sendResponse({storage: selectedStorage})
            }
          })
        }
      }
    })
  }
}

module.exports = StorageManager
