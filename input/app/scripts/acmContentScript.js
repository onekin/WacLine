import URLUtils from './utils/URLUtils'
import Config from './Config'
import _ from 'lodash'
import DOI from 'doi-regex'
import AnnotationServerManagerInitializer from './annotationServer/AnnotationServerManagerInitializer'
import GoogleSheetAnnotationClientManager
  from './annotationServer/googleSheetAnnotationServer/GoogleSheetAnnotationClientManager'

class ACMContentScript {
  constructor () {
    this.doi = null
  }

  init () {
    console.debug('Load ACM content script')
    // Get url params
    const params = URLUtils.extractHashParamsFromUrl(window.location.href)
    // Get document doi
    if (!_.isEmpty(params) && !_.isEmpty(params.doi)) {
      this.doi = params.doi
    } else {
      // Scrap the doi from web
      this.doi = this.findDoi()
    }
    // Add DOI as metadata in webpage
    document.head.insertAdjacentHTML('beforeend', '<meta name="dc.identifier" content="' + this.doi + '">')
    // Get pdf link element
    let pdfLinkElement = this.getPdfLinkElement()
    if (pdfLinkElement) {
      // Get if this tab has an annotation to open
      if (!_.isEmpty(params) && !_.isEmpty(params[Config.urlParamName])) {
        // Activate the extension
        chrome.runtime.sendMessage({ scope: 'extension', cmd: 'activatePopup' }, () => {
          console.debug('Activated popup')
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
              window.acm.annotationServerManager = annotationServerManager
              window.acm.annotationServerManager.init((err) => {
                if (err) {
                  console.error('Unable to initialize annotation server manager')
                } else {
                  let promise
                  // PVSCL:IFCOND(GoogleSheetAnnotationServer, LINE)
                  if (window.abwa.annotationServerManager instanceof GoogleSheetAnnotationClientManager) {
                    promise = new Promise((resolve, reject) => {
                      window.acm.annotationServerManager.reloadWholeCacheDatabase((err) => {
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
                  promise.then(() => {
                    const annotationId = params[Config.urlParamName]
                    window.acm.annotationServerManager.client.fetchAnnotation(annotationId, (err, annotation) => {
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
  }

  /**
   * Depending on the article, the ACM-DL shows the DOI in different parts of the document. This function tries to find in the DOM the DOI for the current paper
   * @returns {*}
   */
  findDoi () {
    if (window.location.href.includes('dl.acm.org/doi/pdf/')) {
      return window.location.href.replace('https://dl.acm.org/doi/pdf/', '').split('#' + Config.urlParamName)[0]
    } else if (window.location.href.includes('dl.acm.org/doi/abs')) {
      return window.location.href.replace('https://dl.acm.org/doi/abs/', '').split('#' + Config.urlParamName)[0]
    } else if (window.location.href.includes('dl.acm.org/doi')) {
      return window.location.href.replace('https://dl.acm.org/doi/', '').split('#' + Config.urlParamName)[0]
    }
    // TODO Check if this still working in ACM new DL
    /* let doiElement = document.querySelector('#divmain > table:nth-child(4) > tbody > tr > td > table > tbody > tr:nth-child(4) > td > span:nth-child(10) > a')
    if (this.checkIfDoiElement(doiElement)) {
      return doiElement.innerText
    }
    doiElement = document.querySelector('#divmain > table > tbody > tr > td:nth-child(1) > table:nth-child(3) > tbody > tr > td > table > tbody > tr:nth-child(5) > td > span:nth-child(10) > a')
    if (this.checkIfDoiElement(doiElement)) {
      return doiElement.innerText
    }
    doiElement = document.querySelector('#divmain > table > tbody > tr > td:nth-child(1) > table:nth-child(3) > tbody > tr > td > table > tbody > tr:nth-child(4) > td > span:nth-child(10) > a')
    if (this.checkIfDoiElement(doiElement)) {
      return doiElement.innerText
    } */
    return null
  }

  checkIfDoiElement (doiElement) {
    return _.isElement(doiElement) &&
      _.isString(doiElement.innerText) &&
      _.isArray(DOI.groups(doiElement.innerText)) &&
      _.isString(DOI.groups(doiElement.innerText)[1])
  }

  getPdfLinkElement () {
    return document.querySelector('a[href*=doi\\/pdf]')
  }
}

window.acm = {}
window.acm.acmContentScript = new ACMContentScript()
window.acm.acmContentScript.init()
