class Popup {
  constructor () {
    this.activated = false
  }

  deactivate () {
    this.activated = false
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'destroyContentScript' }, () => {
        // eslint-disable-next-line quotes
        chrome.pageAction.setIcon({ tabId: tabs[0].id, path: "images/PVSCL:EVAL(WebAnnotator.WebAnnotationClient->pv:Attribute('appShortName'))/icon-38-bw.png" })
      })
    })
  }

  activate () {
    this.activated = true
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'initContentScript' }, () => {
        // eslint-disable-next-line quotes
        chrome.pageAction.setIcon({ tabId: tabs[0].id, path: "images/PVSCL:EVAL(WebAnnotator.WebAnnotationClient->pv:Attribute('appShortName'))/icon-38.png" })
      })
    })
  }
}

export default Popup
