import URLUtils from './utils/URLUtils'
import Config from './Config'
import _ from 'lodash'
import DOI from 'doi-regex'
import AnnotationServerManagerInitializer from './annotationServer/AnnotationServerManagerInitializer'
import GoogleSheetAnnotationClientManager
  from './annotationServer/googleSheetAnnotationServer/GoogleSheetAnnotationClientManager'

class IEEEContentScript {
  constructor () {
    this.doi = null
  }

  initDocument () {
    // Get url params
    let params = URLUtils.extractHashParamsFromUrl(window.location.href)
    // Get document doi
    let getDOIPromise = new Promise((resolve) => {
      if (!_.isEmpty(params) && !_.isEmpty(params.doi)) {
        this.doi = decodeURIComponent(params.doi)
        resolve()
      } else {
        // Scrap the doi from web
        this.findDoi((err, doi) => {
          if (err) {
            resolve()
          } else {
            this.doi = doi
            resolve()
          }
        })
      }
    })
    getDOIPromise.then(() => {
      // Get pdf link element
      let pdfLinkElement = this.getPdfLinkElement()
      if (pdfLinkElement) {
        // Get if this tab has an annotation to open
        if (!_.isEmpty(params) && !_.isEmpty(params[Config.urlParamName])) {
          // Retrieve pdf url
          let pdfUrl = pdfLinkElement.href
          // Create hash with required params to open extension
          let hash = '#' + Config.urlParamName + ':' + params[Config.urlParamName]
          if (this.doi) {
            hash += '&doi:' + this.doi
          }
          // Append hash to pdf url
          pdfUrl += hash
          pdfLinkElement.href += hash
          chrome.runtime.sendMessage({
            scope: 'target',
            cmd: 'setDoiToTab',
            data: { doi: this.doi, annotationId: params[Config.urlParamName] }
          })
          // Redirect browser to pdf if annotation has page in selectors
          AnnotationServerManagerInitializer.init((err, annotationServerManager) => {
            if (err) {
              console.error('Unable to initialize annotation server manager, no redirection')
            } else {
              window.ieee.annotationServerManager = annotationServerManager
              window.ieee.annotationServerManager.init((err) => {
                if (err) {
                  console.error('Unable to initialize annotation server manager')
                } else {
                  let promise
                  // PVSCL:IFCOND(GoogleSheetAnnotationServer, LINE)
                  if (window.abwa.annotationServerManager instanceof GoogleSheetAnnotationClientManager) {
                    promise = new Promise((resolve, reject) => {
                      window.ieee.annotationServerManager.reloadWholeCacheDatabase((err) => {
                        if (err) {
                          reject(err)
                        } else {
                          resolve()
                        }
                      })
                    })
                  } else {
                    promise = new Promise((resolve) => { resolve() })
                  }
                  // PVSCL:ELSECOND
                  promise = new Promise((resolve) => { resolve() })
                  // PVSCL:ENDCOND
                  // Activate the extension
                  chrome.runtime.sendMessage({ scope: 'extension', cmd: 'activatePopup' }, () => {
                    console.debug('Activated popup')
                  })
                  promise.then(() => {
                    const annotationId = params[Config.urlParamName]
                    window.ieee.annotationServerManager.client.fetchAnnotation(annotationId, (err, annotation) => {
                      if (err) {
                        console.error('Unable to retrieve initialization annotation')
                      } else {
                        let annotationFragmentSelector = annotation.target[0].selector.find((selector) => selector.type === 'FragmentSelector')
                        if (annotationFragmentSelector && _.isNumber(annotationFragmentSelector.page)) {
                          window.location.replace(pdfUrl)
                        } else {
                          console.debug('Nothing to do, annotated document is HTML version')
                        }
                      }
                    })
                  })
                }
              })
            }
          })
        } else {
          // Append doi to PDF url
          if (this.doi) {
            pdfLinkElement.href += '#doi:' + this.doi
            // Add DOI as metadata in webpage
            document.head.insertAdjacentHTML('beforeend', '<meta name="dc.identifier" content="' + this.doi + '">')
            chrome.runtime.sendMessage({
              scope: 'target',
              cmd: 'setDoiToTab',
              data: { doi: this.doi }
            })
          }
        }
      }
    })
  }

  /**
   * This function tries to find in the DOM the DOI for the current paper. As IEEE loads dynamically the web content, we must wait until element with DOI is loaded
   * @param callback
   */
  findDoi (callback) {
    // DOI is loaded dynamically as the metadata of the webpage is loaded
    this.waitForDOIElement((err, doiElement) => {
      if (err) {
        // Nothing to do
      } else {
        if (doiElement && this.isDOI(doiElement.innerText)) {
          callback(null, doiElement.innerText)
        } else {
          callback(new Error('Unable to retrieve doi from webpage'))
        }
      }
    })
  }

  isDOI (doiString) {
    return DOI({ exact: true }).test(doiString)
  }

  waitForDOIElement (callback) {
    let counter = 0
    let checkDOIElementLoads = () => {
      let doiElement = document.querySelector('[href*="doi.org"]')
      if (_.isElement(doiElement)) {
        callback(null, doiElement)
      } else {
        if (counter > 20) {
          console.debug('Unable to retrieve doi from webpage')
          callback(new Error('Unable to retrieve doi from webpage'))
        } else {
          counter++
          setTimeout(checkDOIElementLoads, 500)
        }
      }
    }
    checkDOIElementLoads()
  }

  checkIfDoiElement (doiElement) {
    return _.isElement(doiElement) &&
      _.isString(doiElement.innerText) &&
      _.isArray(DOI.groups(doiElement.innerText)) &&
      _.isString(DOI.groups(doiElement.innerText)[1])
  }

  getPdfLinkElement () {
    return document.querySelector('[href*="stamp/stamp.jsp"]')
  }

  initStamp () {
    // Get url params
    let params = URLUtils.extractHashParamsFromUrl(window.location.href)
    // Get document doi
    if (!_.isEmpty(params) && !_.isEmpty(params.doi)) {
      this.doi = decodeURIComponent(params.doi)
    } else {
      // Scrap the doi from web
      this.doi = this.findDoi()
    }
    // Get pdf link element
    let iframeElement = this.getIframeElement()
    if (iframeElement) {
      // Get if this tab has an annotation to open
      if (!_.isEmpty(params) && !_.isEmpty(params[Config.urlParamName])) {
        // Activate the extension
        chrome.runtime.sendMessage({ scope: 'extension', cmd: 'activatePopup' }, () => {
          console.debug('Activated popup')
          // Retrieve pdf url
          let pdfUrl = iframeElement.src
          // Create hash with required params to open extension
          let hash = '#' + Config.urlParamName + ':' + params[Config.urlParamName]
          if (this.doi) {
            hash += '&doi:' + this.doi
          }
          // Append hash to pdf url
          pdfUrl += hash
          // Redirect browser to pdf
          window.location.replace(pdfUrl)
        })
      } else {
        // Append doi to PDF url
        iframeElement.src += '#doi:' + this.doi
        window.location.replace(iframeElement.src)
      }
    }
  }

  getIframeElement () {
    return document.querySelector('iframe[src*="ieeexplore.ieee.org"]')
  }
}

window.ieee = {}
window.ieee.ieeeContentScript = new IEEEContentScript()
if (window.location.href.includes('ieeexplore.ieee.org/document')) {
  window.ieee.ieeeContentScript.initDocument()
} else if (window.location.href.includes('ieeexplore.ieee.org/stamp/stamp.jsp')) {
  window.ieee.ieeeContentScript.initStamp()
}
