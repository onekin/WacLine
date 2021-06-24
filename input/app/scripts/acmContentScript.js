import URLUtils from './utils/URLUtils'
import Config from './Config'
import _ from 'lodash'
import DOI from 'doi-regex'

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
    // TODO Add DOI as param in URL
    // TODO Check if this still working in ACM new DL
    // Get pdf link element
    /* const pdfLinkElement = this.getPdfLinkElement()
    if (pdfLinkElement) {
      // Get if this tab has an annotation to open
      if (!_.isEmpty(params) && !_.isEmpty(params[Config.urlParamName])) {
        // Activate the extension
        chrome.runtime.sendMessage({ scope: 'extension', cmd: 'activatePopup' }, (result) => {
          console.log('Activated popup')
          // Retrieve pdf url
          let pdfUrl = pdfLinkElement.href
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
        if (pdfLinkElement) {
          pdfLinkElement.href += '#doi:' + this.doi
        }
      }
    } */
  }

  /**
   * Depending on the article, the ACM-DL shows the DOI in different parts of the document. This function tries to find in the DOM the DOI for the current paper
   * @returns {*}
   */
  findDoi () {
    if (window.location.href.includes('dl.acm.org/doi/pdf/')) {
      return window.location.href.replace('https://dl.acm.org/doi/pdf/', '')
    } else if (window.location.href.includes('dl.acm.org/doi')) {
      return window.location.href.replace('https://dl.acm.org/doi/', '')
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
    return document.querySelector('#divmain > table:nth-child(2) > tbody > tr > td:nth-child(1) > table:nth-child(1) > tbody > tr > td:nth-child(2) > a')
  }
}

window.acm = {}
window.acm.acmContentScript = new ACMContentScript()
window.acm.acmContentScript.init()
