const _ = require('lodash')
const Events = require('../Events')
// PVSCL:IFCOND(PDF, LINE)
const PDF = require('./formats/PDF')
// PVSCL:ENDCOND
// PVSCL:IFCOND(TXT, LINE)
// TODO const TXT = require('./formats/TXT')
// PVSCL:ENDCOND
// PVSCL:IFCOND(HTML, LINE)
const HTML = require('./formats/HTML')
// PVSCL:ENDCOND
const URLUtils = require('../utils/URLUtils')
const LanguageUtils = require('../utils/LanguageUtils')
const Alerts = require('../utils/Alerts')
// PVSCL:IFCOND(URN, LINE)
const CryptoUtils = require('../utils/CryptoUtils')
const RandomUtils = require('../utils/RandomUtils')
// PVSCL:ENDCOND
const URL_CHANGE_INTERVAL_IN_SECONDS = 1
const axios = require('axios')

class TargetManager {
  constructor () {
    this.url = null
    this.urlChangeInterval = null
    this.urlParam = null
    this.documentId = null
    this.documentTitle = ''
    // PVSCL:IFCOND(HTML, LINE)
    this.documentFormat = HTML // By default document type is html
    // PVSCL:ELSEIFCOND(PDF, LINE)
    this.documentFormat = PDF // By default document type is pdf
    // PVSCL:ELSEIFCOND(TXT, LINE)
    //this.documentFormat = TXT // By default document type is pdf
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(URN, LINE)
    this.localFile = false
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(MoodleResource, LINE)
    this.fileMetadata = {}
    // PVSCL:ENDCOND
  }

  init (callback) {
    if (document.querySelector('embed[type="application/pdf"]')) {
      window.location = chrome.extension.getURL('content/pdfjs/web/viewer.html') + '?file=' + encodeURIComponent(window.location.href)
    } else {
      this.reloadTargetInformation(() => {
        if (_.isFunction(callback)) {
          callback()
        }
      })
    }
  }

  reloadTargetInformation (callback) {
    // PVSCL:IFCOND(DOI, LINE)
    // Try to load doi from the document, page metadata or URL hash param
    this.tryToLoadDoi()
    // PVSCL:ENDCOND
    this.tryToLoadPublicationPDF()
    // PVSCL:IFCOND(Dropbox, LINE)
    this.tryToLoadURLParam()
    // PVSCL:ENDCOND
    this.loadDocumentFormat().then(() => {
      this.tryToLoadTitle()
      this.tryToLoadURL()
      this.tryToLoadURN()
      this.tryToLoadTargetId()
      if (this.url.startsWith('file:///')) {
        this.localFile = true
      } else if (this.documentFormat !== PDF) { // If document is not pdf, it can change its URL
        // Support in ajax websites web url change, web url can change dynamically, but local files never do
        this.initSupportWebURLChange()
      }
      let promise
      // PVSCL:IFCOND(MoodleResource, LINE)
      promise = this.retrievePromiseLoadMoodleMetadata()
      // PVSCL:ELSECOND
      promise = Promise.resolve()
      // PVSCL:ENDCOND
      promise.then(() => {
        if (_.isFunction(callback)) {
          callback()
        }
      }).catch((err) => {
        // PVSCL:IFCOND(MoodleResource, LINE)
        // Warn user document is not from moodle
        Alerts.errorAlert({
          text: 'Try to download the file again from moodle and if the error continues check <a href="https://github.com/haritzmedina/MarkAndGo/wiki/Most-common-errors-in-Mark&Go#file-is-not-from-moodle">this</a>. Error: ' + err.message,
          title: 'This file is not downloaded from moodle'
        })
        // PVSCL:ELSECOND
        Alerts.errorAlert({text: 'Unexpected error: ' + err.message})
        // PVSCL:ENDCOND
      })
    })
  }

  tryToLoadURN () {
    // If document is PDF
    if (this.documentFormat === PDF) {
      this.fingerprint = window.PDFViewerApplication.pdfDocument.pdfInfo.fingerprint
      this.urn = 'urn:x-pdf:' + this.fingerprint
    } else {
      // If document is plain text
      this.fingerprint = this.tryToLoadPlainTextFingerprint()
      if (this.fingerprint) {
        this.urn = 'urn:x-txt:' + this.fingerprint
      }
    }
  }

  tryToLoadTargetId () {
    // Wait until updated all annotations is loaded
    this.targetIdEventListener = document.addEventListener(Events.updatedAllAnnotations, () => {
      if (window.abwa.annotationManagement.annotationReader.allAnnotations.length > 0) {
        this.documentId = window.abwa.annotationManagement.annotationReader.allAnnotations[0].target[0].source.id
      } else {
        this.documentId = RandomUtils.randomString()
      }
    })
  }

  tryToLoadURL () {
    if (this.urlParam) {
      this.url = this.urlParam
    } else {
      this.url = this.getDocumentURL()
    }
  }

  getDocumentURL () {
    if (this.documentFormat === PDF) {
      return window.PDFViewerApplication.url
    } else {
      return URLUtils.retrieveMainUrl(window.location.href) // TODO Check this, i think this url is not valid
    }
  }

  /**
   * Resolves which format
   * @returns {Promise<unknown>}
   */
  loadDocumentFormat () {
    return new Promise((resolve) => {
      if (window.location.pathname === '/content/pdfjs/web/viewer.html') {
        this.documentFormat = PDF
        this.waitUntilPDFViewerLoad(() => {
          resolve()
        })
        return true
      } else {
        // PVSCL:IFCOND(HTML, LINE)
        this.documentFormat = HTML
        // PVSCL:ELSEIFCOND(TXT, LINE)
        //this.documentFormat = TXT
        // PVSCL:ENDCOND
        resolve()
      }
    })
  }
  // PVSCL:IFCOND(MoodleResource, LINE)

  retrievePromiseLoadMoodleMetadata () {
    return new Promise((resolve, reject) => {
      let url
      if (window.location.pathname === '/content/pdfjs/web/viewer.html') {
        url = URLUtils.retrieveMainUrl(window.PDFViewerApplication.url)
      } else {
        url = URLUtils.retrieveMainUrl(window.location.href)
      }
      chrome.runtime.sendMessage({scope: 'annotationFile', cmd: 'fileMetadata', data: {filepath: url}}, (fileMetadata) => {
        if (_.isEmpty(fileMetadata)) {
          this.url = URLUtils.retrieveMainUrl(window.location.href)
          // Metadata is not loaded
          reject(new Error('Metadata is not loaded'))
        } else {
          this.fileMetadata = fileMetadata.file
          this.url = fileMetadata.file.url
          // Calculate fingerprint for plain text files
          this.tryToLoadPlainTextFingerprint()
          this.fileMetadata.contextId = LanguageUtils.getStringBetween(this.fileMetadata.url, 'pluginfile.php/', '/assignsubmission_file')
          this.fileMetadata.itemId = LanguageUtils.getStringBetween(this.fileMetadata.url, 'submission_files/', '/')
          // Metadata is loaded
          resolve()
        }
      })
      return true
    })
  }
  // PVSCL:ENDCOND

  destroy (callback) {
    if (this.documentFormat === PDF) {
      // Reload to original pdf website
      if (_.isUndefined(this.url) || _.isNull(this.url)) {
        window.location.href = window.PDFViewerApplication.baseUrl
      } else {
        // Nothing to do, because you are already in the target source url
      }
    } else {
      if (_.isFunction(callback)) {
        callback()
      }
    }
    clearInterval(this.urlChangeInterval)
  }

  waitUntilPDFViewerLoad (callback) {
    let interval = setInterval(() => {
      if (_.isObject(window.PDFViewerApplication.pdfDocument)) {
        clearInterval(interval)
        if (_.isFunction(callback)) {
          callback(window.PDFViewerApplication)
        }
      }
    }, 500)
  }
  // PVSCL:IFCOND(DOI, LINE)

  tryToLoadDoi () {
    // Try to load doi from hash param
    let decodedUri = decodeURIComponent(window.location.href)
    let params = URLUtils.extractHashParamsFromUrl(decodedUri)
    if (!_.isEmpty(params) && !_.isEmpty(params.doi)) {
      this.doi = decodeURIComponent(params.doi)
    }
    // Try to load doi from page metadata
    if (_.isEmpty(this.doi)) {
      try {
        this.doi = document.querySelector('meta[name="citation_doi"]').content
        if (!this.doi) {
          this.doi = document.querySelector('meta[name="dc.identifier"]').content
        }
      } catch (e) {
        console.debug('Doi not found for this document')
      }
    }
    // TODO Try to load doi from chrome tab storage
  }
  // PVSCL:ENDCOND

  tryToLoadURLParam () {
    let decodedUri = decodeURIComponent(window.location.href)
    console.log(decodedUri)
    let params = URLUtils.extractHashParamsFromUrl(decodedUri, '::')
    console.log(params)
    if (!_.isEmpty(params) && !_.isEmpty(params.url)) {
      console.debug(params.url)
      this.urlParam = params.url
    }
  }

  tryToLoadPublicationPDF () {
    try {
      this.citationPdf = document.querySelector('meta[name="citation_pdf_url"]').content
    } catch (e) {
      console.debug('citation pdf url not found')
    }
  }

  getDocumentRootElement () {
    /* PVSCL:IFCOND(PDF) */if (this.documentFormat === PDF) {
      return document.querySelector('#viewer')
    } /* PVSCL:ELSEIFCOND(HTML) */ else if (this.documentFormat === HTML) {
      return document.body
    } /* PVSCL:ELSEIFCOND(TXT) */ /*else if (this.documentFormat === TXT) {

    }*/ /* PVSCL:ELSECOND */ else {
      Alerts.errorAlert({text: 'The format of the document to be annotated is not supported by the tool yet.'})
    } /* PVSCL:ENDCOND */
  }

  getDocumentURIToSearchInAnnotationServer () {
    if (this.documentFormat === PDF) {
      return this.urn
    } else {
      return this.url
    }
  }

  getDocumentURIToSaveInAnnotationServer () {
    if (this.doi) {
      return 'https://doi.org/' + this.doi
    } else if (this.url) {
      return this.url
    } else if (this.urn) {
      return this.urn
    } else {
      throw new Error('Unable to retrieve any IRI for this document.')
    }
  }

  /**
   * Adds an observer which checks if the URL changes
   */
  initSupportWebURLChange () {
    if (_.isEmpty(this.urlChangeInterval)) {
      this.urlChangeInterval = setInterval(() => {
        let newUrl = this.getDocumentURL()
        if (newUrl !== this.url) {
          console.debug('Document URL updated from %s to %s', this.url, newUrl)
          this.url = newUrl
          // Reload target information
          this.reloadTargetInformation(() => {
            // Dispatch event
            LanguageUtils.dispatchCustomEvent(Events.updatedDocumentURL, {url: this.url})
          })
        }
      }, URL_CHANGE_INTERVAL_IN_SECONDS * 1000)
    }
  }
  // PVSCL:IFCOND(URN, LINE)

  tryToLoadPlainTextFingerprint () {
    let fileTextContentElement = document.querySelector('body > pre')
    if (fileTextContentElement) {
      let fileTextContent = fileTextContentElement.innerText
      return CryptoUtils.hash(fileTextContent.innerText)
    }
  }
  // PVSCL:ENDCOND

  getDocumentURIs () {
    let uris = {}
    if (this.doi) {
      uris['doi'] = 'https://doi.org/' + this.doi
    }
    if (this.url) {
      uris['url'] = this.url
    }
    if (this.urn) {
      uris['urn'] = this.urn
    }
    if (this.citationPdf) {
      uris['citationPdf'] = this.citationPdf
    }
    return uris
  }

  getDocumentLink () {
    let uris = this.getDocumentURIs()
    return _.values(uris, (uri) => {
      return {href: uri}
    })
  }

  getDocumentFingerprint () {
    if (this.fingerprint) {
      return this.fingerprint
    }
  }

  tryToLoadTitle () {
    // Try to load by doi
    let promise = new Promise((resolve, reject) => {
      if (this.doi) {
        let settings = {
          'async': true,
          'crossDomain': true,
          'url': 'https://doi.org/' + this.doi,
          'method': 'GET',
          'headers': {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
        // Call using axios
        axios(settings).then((response) => {
          if (response.data && response.data.title) {
            this.documentTitle = response.data.title
          }
          resolve()
        })
      } else {
        resolve()
      }
    })
    promise.then(() => {
      // Try to load title from page metadata
      if (_.isEmpty(this.documentTitle)) {
        try {
          let documentTitleElement = document.querySelector('meta[name="citation_title"]')
          if (!_.isNull(documentTitleElement)) {
            this.documentTitle = documentTitleElement.content
          }
          if (!this.documentTitle) {
            let documentTitleElement = document.querySelector('meta[property="og:title"]')
            if (!_.isNull(documentTitleElement)) {
              this.documentTitle = documentTitleElement.content
            }
            if (!this.documentTitle) {
              let promise = new Promise((resolve, reject) => {
                // Try to load title from pdf metadata
                if (this.documentFormat === PDF) {
                  this.waitUntilPDFViewerLoad(() => {
                    if (window.PDFViewerApplication.documentInfo.Title) {
                      this.documentTitle = window.PDFViewerApplication.documentInfo.Title
                    }
                    resolve()
                  })
                } else {
                  resolve()
                }
              })
              promise.then(() => {
                // Try to load title from document title
                if (!this.documentTitle) {
                  this.documentTitle = document.title || 'Unknown document'
                }
              })
            }
          }
        } catch (e) {
          console.debug('Title not found for this document')
        }
      }
    })
  }

  /**
   * Returns id for target source
   * @returns String
   */
  getDocumentId () {
    return this.documentId || RandomUtils.randomString()
  }
}

module.exports = TargetManager
