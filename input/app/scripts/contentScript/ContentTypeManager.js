const _ = require('lodash')
const Events = require('./Events')
const URLUtils = require('../utils/URLUtils')
const LanguageUtils = require('../utils/LanguageUtils')
const Alerts = require('../utils/Alerts')
//PVSCL:IFCOND(URN, LINE)
const CryptoUtils = require('../utils/CryptoUtils')
//PVSCL:ENDCOND
const URL_CHANGE_INTERVAL_IN_SECONDS = 1
const axios = require('axios')

class ContentTypeManager {
  constructor () {
    this.pdfFingerprint = null
    this.documentURL = null
    this.urlChangeInterval = null
    this.urlParam = null
    this.documentType = ContentTypeManager.documentTypes.html // By default document type is html
    // PVSCL:IFCOND(URN, LINE)
    this.localFile = false
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(MoodleURL, LINE)
    this.fileMetadata = {}
    // PVSCL:ENDCOND
  }

  init (callback) {
    if (document.querySelector('embed[type="application/pdf"]')) {
      window.location = chrome.extension.getURL('content/pdfjs/web/viewer.html') + '?file=' + encodeURIComponent(window.location.href)
    } else {
      //PVSCL:IFCOND(DOI, LINE)
      // Try to load doi from the document, page metadata or URL hash param
      this.tryToLoadDoi()
      // PVSCL:ENDCOND
      this.tryToLoadPublicationPDF()
      // PVSCL:IFCOND(Dropbox, LINE)
      this.tryToLoadURLParam()
      // PVSCL:ENDCOND
      this.tryToLoadTitle()
      // TODO this.tryToLoadLocalFIleURL() from file metadata
      // If current web is pdf viewer.html, set document type as pdf
      if (window.location.pathname === '/content/pdfjs/web/viewer.html') {
        // Save document type as pdf
        this.documentType = ContentTypeManager.documentTypes.pdf
        // Load content type metadata
        this.loadPDFDocumentContentType(callback)
      } else {
        // Save document type as html
        this.documentType = ContentTypeManager.documentTypes.html
        // Load content type metadata
        this.loadHTMLDocumentContentType(callback)
      }
    }
  }

  loadPDFDocumentContentType (callback) {
    this.waitUntilPDFViewerLoad(() => {
      // Save pdf fingerprint
      this.pdfFingerprint = window.PDFViewerApplication.pdfDocument.pdfInfo.fingerprint
      // Get document URL
      if (this.urlParam) {
        this.documentURL = this.urlParam
      } else {
        if (window.PDFViewerApplication.url.startsWith('file:///')) {
          // PVSCL:IFCOND(URN, LINE)
          // Is a local file
          this.localFile = true
          // PVSCL:ELSECOND
          Alerts.errorAlert({text: 'This application does not support local files annotation.'})
          return
          // PVSCL:ENDCOND
        } else {
          // Is a web file with URL
          this.localFile = false
          this.documentURL = window.PDFViewerApplication.url
        }
      }
      // PVSCL:IFCOND(MoodleURL, LINE)
      this.retrievePromiseLoadMoodleMetadata()
        .then(() => {
          if (_.isFunction(callback)) {
            callback()
          }
        }).catch((err) => {
        // Warn user document is not from moodle
          Alerts.warningAlert({
            text: 'Try to download the file again from moodle and if the error continues check <a href="https://github.com/haritzmedina/MarkAndGo/wiki/Most-common-errors-in-Mark&Go#file-is-not-from-moodle">this</a>. Error: ' + err.message,
            title: 'This file is not downloaded from moodle'
          })
        })
      // PVSCL:ELSECOND
      let promise = Promise.resolve()
      promise.then(() => {
        if (_.isFunction(callback)) {
          callback()
        }
      })
      // PVSCL:ENDCOND   
    })
  }

  loadHTMLDocumentContentType (callback) {
    // Get document URL
    if (this.urlParam) {
      this.documentURL = this.urlParam
    } else {
      if (window.location.href.startsWith('file:///')) {
        // PVSCL:IFCOND(URN, LINE)
        // Is a local file
        this.localFile = true
        this.tryToLoadPlainTextFingerprint()
        // PVSCL:ELSECOND
        Alerts.errorAlert({text: 'This application does not support local files annotation.'})
        return
        // PVSCL:ENDCOND
      } else {
        // Is a web file with URL
        this.localFile = false
        this.documentURL = URLUtils.retrieveMainUrl(window.location.href)
        // Initialize web url change observer
        this.initSupportWebURLChange()
      }
    }
    // PVSCL:IFCOND(MoodleURL, LINE)
    this.retrievePromiseLoadMoodleMetadata()
      .then(() => {
        if (_.isFunction(callback)) {
          callback()
        }
      }).catch((err) => {
        // Warn user document is not from moodle
        Alerts.warningAlert({
          text: 'Try to download the file again from moodle and if the error continues check <a href="https://github.com/haritzmedina/MarkAndGo/wiki/Most-common-errors-in-Mark&Go#file-is-not-from-moodle">this</a>. Error: ' + err.message,
          title: 'This file is not downloaded from moodle'
        })
      })
    // PVSCL:ELSECOND
    let promise = Promise.resolve()
    promise.then(() => {
      if (_.isFunction(callback)) {
        callback()
      }
    })
    // PVSCL:ENDCOND  
  }
  // PVSCL:IFCOND(MoodleURL, LINE)

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
          this.documentURL = URLUtils.retrieveMainUrl(window.location.href)
          // Metadata is not loaded
          reject(new Error('Metadata is not loaded'))
        } else {
          this.fileMetadata = fileMetadata.file
          this.documentURL = fileMetadata.file.url
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
    if (this.documentType === ContentTypeManager.documentTypes.pdf) {
      // Reload to original pdf website
      if (_.isUndefined(this.documentURL) || _.isNull(this.documentURL)) {
        window.location.href = window.PDFViewerApplication.baseUrl
      } else {
        window.location.href = this.documentURL
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
      this.doi = params.doi
    }
    // Try to load doi from page metadata
    if (_.isEmpty(this.doi)) {
      try {
        this.doi = document.querySelector('meta[name="citation_doi"]').content
      } catch (e) {
        console.debug('Doi not found for this document')
      }
    }
    // TODO Try to load doi from chrome tab storage
  }
  // PVSCL:ENDCOND

  tryToLoadURLParam () {
    let decodedUri = decodeURIComponent(window.location.href)
    let params = URLUtils.extractHashParamsFromUrl(decodedUri, '::')
    if (!_.isEmpty(params) && !_.isEmpty(params.url)) {
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
    if (this.documentType === ContentTypeManager.documentTypes.pdf) {
      return document.querySelector('#viewer')
    } else if (this.documentType === ContentTypeManager.documentTypes.html) {
      return document.body
    }
  }

  getDocumentURIToSearchInHypothesis () {
    // PVSCL:IFCOND(URN, LINE)
    if (this.documentType === ContentTypeManager.documentTypes.pdf) {
      return 'urn:x-pdf:' + this.pdfFingerprint
    } else if (this.documentFingerprint) {
      return 'urn:x-txt:' + this.documentFingerprint
    } else {
      return this.documentURL
    }
    // PVSCL:ELSECOND
    return this.documentURL
    // PVSCL:ENDCOND
  }

  getDocumentURIToSave () {
    // PVSCL:IFCOND(URN and NOT (MoodleURL), LINE)
    if (this.localFile) {
      return 'urn:x-pdf:' + this.pdfFingerprint
    } else {
      return this.documentURL
    }
    // PVSCL:ELSECOND
    return this.documentURL
    // PVSCL:ENDCOND
  }

  initSupportWebURLChange () {
    this.urlChangeInterval = setInterval(() => {
      let newUrl = URLUtils.retrieveMainUrl(window.location.href)
      if (newUrl !== this.documentURL) {
        console.debug('Document URL updated from %s to %s', this.documentURL, newUrl)
        this.documentURL = newUrl
        // Dispatch event
        LanguageUtils.dispatchCustomEvent(Events.updatedDocumentURL, {url: this.documentURL})
      }
    }, URL_CHANGE_INTERVAL_IN_SECONDS * 1000)
  }
  // PVSCL:IFCOND(URN, LINE)

  tryToLoadPlainTextFingerprint () {
    let fileTextContentElement = document.querySelector('body > pre')
    if (fileTextContentElement) {
      let fileTextContent = fileTextContentElement.innerText
      this.documentFingerprint = CryptoUtils.hash(fileTextContent.innerText)
    }
  }
  // PVSCL:ENDCOND

  getDocumentURIs () {
    let uris = []
    if (this.doi) {
      uris.push('https://doi.org/' + this.doi)
    }
    if (this.documentURL) {
      uris.push(this.documentURL)
    }
    if (this.pdfFingerprint) {
      uris.push('urn:x-pdf:' + this.pdfFingerprint)
    }
    if (this.documentFingerprint) {
      uris.push('urn:x-txt:' + this.documentFingerprint)
    }
    return uris
  }

  getDocumentLink () {
    let uris = this.getDocumentURIs()
    return _.map(uris, (uri) => {
      return {href: uri}
    })
  }

  getDocumentFingerprint () {
    if (this.pdfFingerprint) {
      return this.pdfFingerprint
    } else if (this.documentFingerprint) {
      return this.documentFingerprint
    } else {
      return null
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
                if (this.documentType === ContentTypeManager.documentTypes.pdf) {
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
}

ContentTypeManager.documentTypes = {
  html: {
    name: 'html',
    selectors: ['FragmentSelector', 'RangeSelector', 'TextPositionSelector', 'TextQuoteSelector']
  },
  pdf: {
    name: 'pdf',
    selectors: ['FragmentSelector', 'TextPositionSelector', 'TextQuoteSelector']
  }
}

module.exports = ContentTypeManager
