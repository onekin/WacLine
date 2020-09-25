import URLUtils from './utils/URLUtils'
import _ from 'lodash'
import DOI from 'doi-regex'
import Config from './Config'

class SpringerContentScript {
  constructor () {
    this.doi = null
  }

  init () {
    // Get document doi from metadata or dom
    // Get url params
    const params = URLUtils.extractHashParamsFromUrl(window.location.href)
    // Get document doi
    if (!_.isEmpty(params) && !_.isEmpty(params.doi)) {
      this.doi = params.doi
    } else {
      // Scrap the doi from web
      this.doi = this.findDoi()
    }
    // Get pdf link element
    const pdfLinkElements = this.getPdfLinkElement()
    if (pdfLinkElements.length > 0) {
      // Get if this tab has an annotation to open
      if (!_.isEmpty(params) && !_.isEmpty(params[Config.urlParamName])) {
        // Activate the extension
        chrome.runtime.sendMessage({ scope: 'extension', cmd: 'activatePopup' }, (result) => {
          console.log('Activated popup')
          // Retrieve pdf url
          let pdfUrl = pdfLinkElements[0].href
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
        const doi = this.doi
        pdfLinkElements.forEach(function (pdfLinkElement) {
          pdfLinkElement.href += '#doi:' + doi
        })
      }
    }
  }

  /**
   * Depending on the article, the ACM-DL shows the DOI in different parts of the document. This function tries to find in the DOM the DOI for the current paper
   * @returns {*}
   */
  findDoi () {
    const doiElem = document.querySelector('head > meta[name="citation_doi"]')
    if (_.isElement(doiElem)) {
      if (!this.checkIfDoiElement(doiElem.content)) {
        return doiElem.content
      }
    }

    const doiText = document.querySelector('#doi-url')
    if (this.checkIfDoiElement(doiText)) {
      return doiText.innerText
    }
    return null
  }

  checkIfDoiElement (doiElement) {
    return _.isElement(doiElement) &&
      _.isString(doiElement.innerText) &&
      _.isArray(DOI.groups(doiElement.innerText)) &&
      _.isString(DOI.groups(doiElement.innerText)[1])
  }

  getPdfLinkElement () {
    // Paper download link
    const selectorsStrings = ['#main-content > div > div > div.cta-button-container.cta-button-container--top.cta-button-container--stacked.u-mb-16.u-hide-two-col > div > a',
      '#article-actions > div > div.download-article.test-pdf-link > div > a',
      '#cobranding-and-download-availability-text > div > a',
      '#main-content > article.main-wrapper.main-wrapper--no-gradient.main-wrapper--dual-main > div > div > div.cta-button-container.cta-button-container--inline.cta-button-container--stacked.u-pt-36.test-download-book-separate-buttons > div:nth-child(1) > a',
      '#main-content > article.main-wrapper.main-wrapper--no-gradient.main-wrapper--dual-main > div > div > div.cta-button-container.cta-button-container--stacked.u-pt-36 > div > div > a']
    const pdfLinks = selectorsStrings.reduce(function (result, selector) {
      const pdfLink = document.querySelector(selector)
      if (_.isElement(pdfLink)) {
        result.push(pdfLink)
      }
      return result
    }, [])
    return pdfLinks
  }
}

window.springer = {}
window.springer.springerContentScript = new SpringerContentScript()
window.springer.springerContentScript.init()
