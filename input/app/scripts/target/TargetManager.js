import _ from 'lodash'
import Events from '../Events'
// PVSCL:IFCOND(PDF, LINE)
import PDF from './formats/PDF'
// PVSCL:ENDCOND
// PVSCL:IFCOND(TXT, LINE)
import TXT from './formats/TXT'
// PVSCL:ENDCOND
// PVSCL:IFCOND(HTML, LINE)
import HTML from './formats/HTML'
// PVSCL:ENDCOND
import URLUtils from '../utils/URLUtils'
import LanguageUtils from '../utils/LanguageUtils'
import Alerts from '../utils/Alerts'
import RandomUtils from '../utils/RandomUtils'
// PVSCL:IFCOND(URN, LINE)
import CryptoUtils from '../utils/CryptoUtils'
// PVSCL:ENDCOND
const URL_CHANGE_INTERVAL_IN_SECONDS = 5

class TargetManager {
  constructor () {
    this.url = null
    this.urlChangeInterval = null
    this.urlParam = null
    this.documentId = null
    this.documentTitle = ''
    this.fileName = ''
    // PVSCL:IFCOND(HTML, LINE)
    this.documentFormat = HTML // By default document type is html
    // PVSCL:ELSEIFCOND(PDF, LINE)
    this.documentFormat = PDF // By default document type is pdf
    // PVSCL:ELSEIFCOND(TXT, LINE)
    // this.documentFormat = TXT // By default document type is txt
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
    } else if (this.isPlainTextFile()) {
      window.location = chrome.extension.getURL('content/plainTextFileViewer/index.html') + '?file=' + encodeURIComponent(window.location.href)
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
    this.loadDocumentFormat().catch((err) => {
      Alerts.errorAlert({ title: 'Not supported document format', text: err.message })
    }).then(() => {
      this.tryToLoadTitle()
      this.tryToLoadURL()
      this.tryToLoadURN()
      this.tryToLoadTargetId()
      let promise
      // PVSCL:IFCOND(MoodleResource, LINE)
      promise = this.retrievePromiseLoadMoodleMetadata()
      // PVSCL:ELSECOND
      promise = Promise.resolve()
      // PVSCL:ENDCOND
      promise.then(() => {
        this.tryToLoadFileName()
        if (this.url.startsWith('file:///')) {
          this.localFile = true
        } else if (this.documentFormat !== PDF && !this.localFile) { // If document is not pdf, it can change its URL
          // Support in ajax websites web url change, web url can change dynamically, but local files never do
          this.initSupportWebURLChange()
        }
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
        Alerts.errorAlert({ text: 'Unexpected error: ' + err.message })
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
    return new Promise((resolve, reject) => {
      if (window.location.pathname === '/content/pdfjs/web/viewer.html') {
        this.documentFormat = PDF
        this.waitUntilPDFViewerLoad(() => {
          resolve()
        })
        return true
      } /* PVSCL:IFCOND(TXT) */else if ((document.body && document.body.children.length === 1 && document.body.children[0].nodeName === 'PRE') || window.location.pathname === '/content/plainTextFileViewer/index.html') { // TODO Check if document is loaded in content/plainTextFileViewer
        // TODO Check if document.body is loaded or not yet
        this.documentFormat = TXT
        resolve()
      } /* PVSCL:ENDCOND */else {
        // PVSCL:IFCOND(HTML, LINE)
        this.documentFormat = HTML
        // PVSCL:ELSEIFCOND(TXT, LINE)
        this.documentFormat = TXT
        // PVSCL:ENDCOND
        if (_.isEmpty(this.documentFormat)) {
          reject(new Error('Unable to identify document format. Probably, this document format is not supported by the tool.'))
        } else {
          resolve()
        }
      }
    })
  }
  // PVSCL:IFCOND(MoodleResource, LINE)

  retrievePromiseLoadMoodleMetadata () {
    return new Promise((resolve, reject) => {
      let url
      if (window.location.pathname === '/content/pdfjs/web/viewer.html') {
        url = URLUtils.retrieveMainUrl(window.PDFViewerApplication.url)
      } else if (window.location.pathname === '/content/plainTextFileViewer/index.html') {
        url = URLUtils.retrieveMainUrl((new URL(window.location.href)).searchParams.get('file'))
      } else {
        url = URLUtils.retrieveMainUrl(window.location.href)
      }
      this.localFile = true
      chrome.runtime.sendMessage({ scope: 'annotationFile', cmd: 'fileMetadata', data: { filepath: url } }, (fileMetadata) => {
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
          // If document is loaded from moodle action=grading page (where list of all submissions appear) there is no way to load fileitemid, so need to retrieve it from grader page
          this.retrieveMoodleFileItemId()
          // Metadata is loaded
          resolve()
        }
      })
      return true
    })
  }
  // PVSCL:ENDCOND

  destroy (callback) {
    // PVSCL:IFCOND(PDF, LINE)
    if (this.documentFormat === PDF) {
      // Reload to original pdf website
      window.location.href = window.PDFViewerApplication.baseUrl
    }
    // PVSCL:ENDCOND
    if (_.isFunction(callback)) {
      callback()
    }
    clearInterval(this.urlChangeInterval)
  }

  waitUntilPDFViewerLoad (callback) {
    const interval = setInterval(() => {
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
    const decodedUri = decodeURIComponent(window.location.href)
    const params = URLUtils.extractHashParamsFromUrl(decodedUri)
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
    const decodedUri = decodeURIComponent(window.location.href)
    console.log(decodedUri)
    const params = URLUtils.extractHashParamsFromUrl(decodedUri, '::')
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
    } /* PVSCL:ELSEIFCOND(TXT) */ else if (this.documentFormat === TXT) {
      return document.body
    } /* PVSCL:ELSECOND */ else {
      Alerts.errorAlert({ text: 'The format of the document to be annotated is not supported by the tool yet.' })
    } /* PVSCL:ENDCOND */
  }

  getDocumentURIToSearchInAnnotationServer () {
    // Searches are done using uri and url parameters that hypothes.is (and other annotation systems) supports.
    // This includes options in the search query this function and getDocumentURIToSaveInAnnotationServer.
    // As the second one prioritize resilient URLs, this function gives priority to URN
    /* PVSCL:IFCOND(PDF) */if (this.documentFormat === PDF) {
      return this.urn
    } /* PVSCL:ELSEIFCOND(HTML) */ else if (this.documentFormat === TXT) {
      return this.urn
    } /* PVSCL:ELSECOND */ else {
      return this.url
    } /* PVSCL:ENDCOND */
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
        const newUrl = this.getDocumentURL()
        if (newUrl !== this.url) {
          console.debug('Document URL updated from %s to %s', this.url, newUrl)
          this.url = newUrl
          // Reload target information
          this.reloadTargetInformation(() => {
            // Dispatch event
            LanguageUtils.dispatchCustomEvent(Events.updatedDocumentURL, { url: this.url })
          })
        }
      }, URL_CHANGE_INTERVAL_IN_SECONDS * 1000)
    }
  }
  // PVSCL:IFCOND(URN, LINE)

  tryToLoadPlainTextFingerprint () {
    const fileTextContentElement = document.querySelector('body > pre')
    if (fileTextContentElement) {
      const fileTextContent = fileTextContentElement.innerText
      return CryptoUtils.hash(fileTextContent)
    }
  }
  // PVSCL:ENDCOND

  getDocumentURIs () {
    const uris = {}
    if (this.doi) {
      uris.doi = 'https://doi.org/' + this.doi
    }
    if (this.url) {
      uris.url = this.url
    }
    if (this.urn) {
      uris.urn = this.urn
    }
    if (this.citationPdf) {
      uris.citationPdf = this.citationPdf
    }
    return uris
  }

  getDocumentLink () {
    const uris = this.getDocumentURIs()
    return _.values(uris, (uri) => {
      return { href: uri }
    })
  }

  getDocumentFingerprint () {
    if (this.fingerprint) {
      return this.fingerprint
    }
  }

  isPlainTextFile () {
    let result = false
    if (window.location.pathname !== '/content/pdfjs/web/viewer.html') {
      if (document.querySelector('body').children.length === 1 && _.isElement(document.querySelector('body > pre'))) { // It is opened with default plain text viewer in chrome
        result = true
      } else {
        if (document.querySelector('#webkit-xml-viewer-source-xml')) { // It is loaded with default xml viewer
          result = true
        } else {
          if (window.location.pathname !== '/content/plainTextFileViewer/index.html') {
            // PVSCL:IFCOND(NOT (MoodleResource), LINE) // It is plain text file but it is already opened with custom plain text viewer
            const extension = window.location.href.split('.').pop().split(/#|\?/g)[0]
            result = 'xml,xsl,xslt,xquery,xsql,'.split(',').includes(extension)
            // PVSCL:ELSECOND // When is downloaded from moodle it must be always be opened with custom viewer to ensure CORS over moodle is not applied
            result = true
            // PVSCL:ENDCOND
          }
        }
      }
    }
    return result
  }

  tryToLoadTitle () {
    // Try to load by doi
    const promise = new Promise((resolve, reject) => {
      if (this.doi) {
        const settings = {
          async: true,
          crossDomain: true,
          url: 'https://doi.org/' + this.doi,
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
        // Call using axios
        const axios = require('axios').default
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
          const documentTitleElement = document.querySelector('meta[name="citation_title"]')
          if (!_.isNull(documentTitleElement)) {
            this.documentTitle = documentTitleElement.content
          }
          if (!this.documentTitle) {
            const documentTitleElement = document.querySelector('meta[property="og:title"]')
            if (!_.isNull(documentTitleElement)) {
              this.documentTitle = documentTitleElement.content
            }
            if (!this.documentTitle) {
              const promise = new Promise((resolve, reject) => {
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

  tryToLoadFileName () {
    // PVSCL:IFCOND(MoodleResource, LINE)
    // Get filename from moodle URL
    try {
      let filename = (/submission_files\/(.*)\/(.*)\?forcedownload=1/gm).exec(this.url)[2]
      if (!_.isEmpty(filename)) {
        this.fileName = filename
      }
    } catch (e) {
      console.error('Unable to retrieve name from file downloaded from moodle')
    }
    // PVSCL:ENDCOND
    // Get name from URL
    if (_.isEmpty(this.fileName) && this.url) {
      let filename = _.last(_.split((new URL(this.url)).pathname, '/'))
      if (!_.isEmpty(filename)) {
        this.fileName = filename
      }
    }
  }

  // PVSCL:IFCOND(MoodleResource, LINE)
  retrieveMoodleFileItemId () {
    if (_.isEmpty(this.fileMetadata) || _.isEmpty(this.fileMetadata.feedbackFileItemId)) {
      const APISimulation = require('../moodle/APISimulation').default
      APISimulation.scrapFileItemId({
        contextId: this.fileMetadata.contextId,
        studentId: this.fileMetadata.studentId,
        moodleEndpoint: this.url.split('pluginfile.php')[0]
      }, (err, fileItemId) => {
        if (err) {
          // Nothing to do, silent error management
        } else {
          this.fileMetadata.fileItemId = fileItemId
        }
      })
    }
  }
  // PVSCL:ENDCOND
}

export default TargetManager
