// PVSCL:IFCOND(Hypothesis, LINE)
import HypothesisClientManager from './annotationServer/hypothesis/HypothesisClientManager'
// PVSCL:ENDCOND
// PVSCL:IFCOND(BrowserStorage, LINE)
import BrowserStorageManager from './annotationServer/browserStorage/BrowserStorageManager'
// PVSCL:ENDCOND
import _ from 'lodash'
import LanguageUtils from './utils/LanguageUtils'
import Alerts from './utils/Alerts'

let kudeatzaileakHasieratu = function () {
  let checkDOM = setInterval(function () {
    window.cag = {}
    window.cag.annotations = []
    // PVSCL:IFCOND(Hypothesis, LINE)
    window.cag.annotationServerManager = new HypothesisClientManager()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(BrowserStorage, LINE)
    window.cag.annotationServerManager = new BrowserStorageManager()
    // PVSCL:ENDCOND
    window.cag.annotationServerManager.init((err) => {
      if (err) {
        window.open(chrome.extension.getURL('pages/options.html#cmapCloudConfiguration'))
      } else {
        window.cag.annotationServerManager.isLoggedIn((err, result) => {
          if (err || !result) {
            // PVSCL:IFCOND(Hypothesis,LINE)
            if (LanguageUtils.isInstanceOf(window.cag.annotationServerManager, HypothesisClientManager)) {
              window.open(chrome.extension.getURL('pages/options.html#cmapCloudConfiguration'))
            }
            // PVSCL:ENDCOND
          } else {
            // Options for the observer (which mutations to observe)
            const config = { attributes: false, childList: true, subtree: true }
            // Callback function to execute when mutations are observed
            const callback = (mutationList, observer) => {
              for (const mutation of mutationList) {
                if (mutation.type === 'childList') {
                  if (mutation.addedNodes) {
                    if (mutation.addedNodes.length > 0) {
                      // console.log('added nodes', mutation.addedNodes)
                      let node = mutation.addedNodes[0]
                      if (node.className && node.className === 'gwt-PopupPanel') {
                        console.log('OPEN')
                        let annotations = node.children[0].children[0].children[0].children
                        for (let i = 0; i < annotations.length; i++) {
                          let id = annotations[i].innerText.slice(-22)
                          console.log(id)
                          if (window.cag.annotations.length > 0) {
                            let annotation = window.cag.annotations.find((anno) => {
                              return anno.id === id
                            })
                            console.log(annotation)
                            let textQuote = annotation.target[0].selector.find((sel) => {
                              return sel.type === 'TextQuoteSelector'
                            })
                            let text
                            if (textQuote) {
                              text = textQuote.exact
                            }
                            annotations[i].classList.add('tooltipCmap')
                            let span = document.createElement('span')
                            span.className = 'tooltiptextCmap'
                            span.innerText = text
                            annotations[i].appendChild(span)
                          }
                        }
                      } else if (node.innerText === 'Change Properties...') {
                        console.log('YOU HAVE OPEN A MAP')
                        let list = document.querySelectorAll('.cmap-tab.active')
                        if (list.length > 0) {
                          let name = list[0].querySelectorAll('.cmap-tab-label')
                          let groupID = name[0].innerText.slice(-10).replace('(', '').replace(')', '')
                          window.cag.annotationServerManager.client.searchAnnotations({
                            group: groupID,
                            order: 'desc'
                          }, (err, annotations) => {
                            if (err) {
                              Alerts.errorAlert({
                                title: 'Log in required',
                                text: 'Annotations not found'
                              })
                            } else {
                              annotations = _.filter(annotations, (annotation) => {
                                return !annotation.motivation && annotation.motivation !== 'codebookDevelopment'
                              })
                              window.cag.annotations = annotations
                            }
                          })
                        }
                      }
                    }
                  } else {
                    console.log('removed node', mutation.removedNodes)
                  }
                }
              }
            }
            // Create an observer instance linked to the callback function
            const observer = new MutationObserver(callback)
            // Start observing the target node for configured mutations
            observer.observe(document.body, config)
          }
        })
      }
    })
    clearInterval(checkDOM)
  }, 1000)
}

window.onload = kudeatzaileakHasieratu
