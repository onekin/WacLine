import URLUtils from './utils/URLUtils'
import Config from './Config'
import _ from 'lodash'
import DOI from 'doi-regex'

class IEEEContentScript {
  constructor () {
    this.doi = null
    this.hag = null
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
        if (!_.isEmpty(params) && !_.isEmpty(Config.urlParamName)) {
          // Activate the extension
          chrome.runtime.sendMessage({ scope: 'extension', cmd: 'activatePopup' }, () => {
            console.debug('Activated popup')
            // Retrieve pdf url
            let pdfUrl = pdfLinkElement.href
            // Create hash with required params to open extension
            let hash = '#hag:' + params.hag
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
          if (this.doi) {
            pdfLinkElement.href += '#doi:' + this.doi
            // Add DOI as metadata in webpage
            document.head.insertAdjacentHTML('beforeend', '<meta name="dc.identifier" content="' + this.doi + '">')
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
      if (!_.isEmpty(params) && !_.isEmpty(params.hag)) {
        // Activate the extension
        chrome.runtime.sendMessage({ scope: 'extension', cmd: 'activatePopup' }, () => {
          console.debug('Activated popup')
          // Retrieve pdf url
          let pdfUrl = iframeElement.src
          // Create hash with required params to open extension
          let hash = '#hag:' + params.hag
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
