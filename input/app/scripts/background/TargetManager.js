import DOI from 'doi-regex'
import axios from 'axios'
// PVSCL:IFCOND(ScienceDirect, LINE)
import URLUtils from '../utils/URLUtils'
// PVSCL:ENDCOND
import Config from '../Config'
import _ from 'lodash'

class TargetManager {
  constructor () {
    // PVSCL:IFCOND(DOI, LINE)
    this.doiUrlFilterObject = { urls: ['*://*.doi.org/*', '*://doi.org/*'] }
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(ScienceDirect, LINE)
    this.scienceDirect = { urls: ['*://www.sciencedirect.com/science/article/pii/*'] }
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Dropbox, LINE)
    this.dropbox = { urls: ['*://www.dropbox.com/s/*?raw=1*'] }
    this.dropboxContent = { urls: ['*://*.dropboxusercontent.com/*'] }
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(IEEE, LINE)
    this.ieee = { urls: ['*://ieeexplore.ieee.org/stamp/stamp.jsp*'] }
    // PVSCL:ENDCOND
    this.tabs = {}
  }

  init () {
    this.initContentScriptCallsListener()
    // PVSCL:IFCOND(DOI, LINE)
    // Requests to doi.org
    chrome.webRequest.onHeadersReceived.addListener((responseDetails) => {
      console.debug(responseDetails)
      const locationIndex = _.findIndex(responseDetails.responseHeaders, (header) => header.name === 'location')
      const locationUrl = responseDetails.responseHeaders[locationIndex].value
      try {
        const redirectUrl = new URL(locationUrl)
        // Retrieve doi from call
        let doi = ''
        if (_.isArray(DOI.groups(responseDetails.url))) {
          doi = DOI.groups(responseDetails.url)[1]
        }
        const annotationId = this.extractAnnotationId(responseDetails.url)
        if (doi) {
          if (_.isEmpty(redirectUrl.hash)) {
            redirectUrl.hash += '#doi:' + doi
          } else {
            redirectUrl.hash += '&doi:' + doi
          }
        }
        if (annotationId) {
          if (_.isEmpty(redirectUrl.hash)) {
            redirectUrl.hash += '#' + Config.urlParamName + ':' + annotationId
          } else {
            redirectUrl.hash += '&' + Config.urlParamName + ':' + annotationId
          }
        }
        responseDetails.responseHeaders[locationIndex].value = redirectUrl.toString()
        this.tabs[responseDetails.tabId] = { doi: doi, annotationId: annotationId }
        return { responseHeaders: responseDetails.responseHeaders }
      } catch (e) {
        return { responseHeaders: responseDetails.responseHeaders }
      }
    }, this.doiUrlFilterObject, ['responseHeaders', 'blocking'])
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(ScienceDirect, LINE)
    // Requests to sciencedirect, redirection from linkinghub.elsevier.com (parse doi and annotation hash param if present)
    chrome.webRequest.onBeforeSendHeaders.addListener((requestHeaders) => {
      const referer = _.find(requestHeaders.requestHeaders, (requestHeader) => { return requestHeader.name === 'Referer' })
      if (referer && referer.value.includes('linkinghub.elsevier.com')) {
        chrome.tabs.get(requestHeaders.tabId, (tab) => {
          let doi = null
          let annotationId = null
          const url = tab.url
          // Retrieve doi
          const doiGroups = DOI.groups(url)
          if (doiGroups && doiGroups[1]) {
            doi = doiGroups[1]
            doi = doi.split('&' + Config.urlParamName)[0] // If doi-regex inserts also the annotation hash parameter, remove it, is not part of the doi
          }
          const params = URLUtils.extractHashParamsFromUrl(url)
          if (params && params[Config.urlParamName]) {
            annotationId = params[Config.urlParamName]
          }
          console.debug(requestHeaders)
          if (doi && annotationId) {
            const redirectUrl = requestHeaders.url + '#doi:' + doi + '&' + Config.urlParamName + ':' + annotationId
            chrome.tabs.update(requestHeaders.tabId, { url: redirectUrl })
          } else if (doi) {
            const redirectUrl = requestHeaders.url + '#doi:' + doi
            chrome.tabs.update(requestHeaders.tabId, { url: redirectUrl })
          } else if (annotationId) {
            const redirectUrl = requestHeaders.url + '#' + Config.urlParamName + ':' + annotationId
            chrome.tabs.update(requestHeaders.tabId, { url: redirectUrl })
          }
        })
      }
    }, this.scienceDirect, ['requestHeaders', 'blocking', 'extraHeaders'])
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Dropbox, LINE)
    // Request to dropbox
    chrome.webRequest.onHeadersReceived.addListener((responseDetails) => {
      this.tabs[responseDetails.tabId] = {
        url: encodeURI(responseDetails.url.split('#')[0]),
        annotationId: this.extractAnnotationId(responseDetails.url)
      }
    }, this.dropbox, ['responseHeaders', 'blocking'])
    // Request dropbox pdf files
    chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
      const index = _.findIndex(details.requestHeaders, (header) => { return header.name.toLowerCase() === 'accept' })
      details.requestHeaders[index].value = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
      return { requestHeaders: details.requestHeaders }
    }, this.dropboxContent, ['blocking', 'requestHeaders', 'extraHeaders'])

    chrome.webRequest.onCompleted.addListener((details) => {
      if (this.tabs[details.tabId]) {
        chrome.tabs.sendMessage(details.tabId, { scope: 'dropbox', cmd: 'redirection', data: this.tabs[details.tabId] })
      }
    }, this.dropboxContent)
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(IEEE, LINE)
    // Request to IEEE
    chrome.webRequest.onBeforeSendHeaders.addListener((requestHeaders) => {
      if (this.tabs[requestHeaders.tabId]) {
        let data = this.tabs[requestHeaders.tabId]
        chrome.tabs.get(requestHeaders.tabId, (tab) => {
          let doi = data.doi
          let annotationId = data.annotationId
          if (doi && annotationId) {
            let redirectUrl = requestHeaders.url + '#doi:' + doi + '&hag:' + annotationId
            chrome.tabs.update(requestHeaders.tabId, { url: redirectUrl })
          } else if (doi) {
            let redirectUrl = requestHeaders.url + '#doi:' + doi
            chrome.tabs.update(requestHeaders.tabId, { url: redirectUrl })
          } else if (annotationId) {
            let redirectUrl = requestHeaders.url + '#hag:' + annotationId
            chrome.tabs.update(requestHeaders.tabId, { url: redirectUrl })
          }
        })
        delete this.tabs[requestHeaders.tabId] // Delete metadata saved in tabs for current tab
      }
    }, this.ieee, ['requestHeaders', 'blocking', 'extraHeaders'])
    // PVSCL:ENDCOND
  }

  extractAnnotationId (url) {
    if (url.includes('#')) {
      const parts = url.split('#')[1].split(':')
      if (parts[0] === Config.urlParamName) {
        return parts[1] || null
      }
    } else {
      return null
    }
  }

  initContentScriptCallsListener () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'target') {
        if (request.cmd === 'getMetadataFromDoi') {
          this.getMetadataFromDoi(request.data.doi, (err, result) => {
            if (err) {
              sendResponse({ error: err })
            } else {
              sendResponse(result)
            }
          })
        } else if (request.cmd === 'setDoiToTab') {
          let tabId = sender.tab.id
          let doi = request.data.doi
          let annotationId = request.data.annotationId
          if (tabId && doi) {
            let obj = { doi: doi }
            if (annotationId) {
              obj[annotationId] = annotationId
            }
            this.tabs[tabId] = obj

          }
        }
      }
      return true
    })
  }

  getMetadataFromDoi (doi, callback) {
    const settings = {
      async: true,
      crossDomain: true,
      url: 'https://doi.org/' + doi,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    }
    // Call using axios
    axios(settings).catch(err => {
      if (_.isFunction(callback)) {
        callback(err)
      }
    }).then((response) => {
      if (_.isFunction(callback)) {
        callback(null, response.data)
      }
    })
  }
}

export default TargetManager
