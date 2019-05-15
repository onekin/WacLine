const DOI = require('doi-regex')
const URLUtils = require('../utils/URLUtils')
const _ = require('lodash')

class TargetManager {
  constructor () {
	  // PVSCL:IFCOND(DOI, LINE)
    this.doiUrlFilterObject = { 'urls': ['*://*.doi.org/*', '*://doi.org/*'] }
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(ScienceDirect, LINE)
    this.scienceDirect = { 'urls': ['*://www.sciencedirect.com/science/article/pii/*'] }
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Dropbox, LINE)
    this.dropbox = {'urls': ['*://www.dropbox.com/s/*?raw=1*']}
    this.dropboxContent = {'urls': ['*://*.dropboxusercontent.com/*']}
    this.tabs = {}
    // PVSCL:ENDCOND
  }

  init () {
	  // PVSCL:IFCOND(DOI, LINE)
    // Requests to doi.org
    chrome.webRequest.onHeadersReceived.addListener((responseDetails) => {
      console.debug(responseDetails)
      let locationIndex = _.findIndex(responseDetails.responseHeaders, (header) => header.name === 'location')
      let locationUrl = responseDetails.responseHeaders[locationIndex].value
      try {
        let redirectUrl = new URL(locationUrl)
        // Retrieve doi from call
        let doi = ''
        if (_.isArray(DOI.groups(responseDetails.url))) {
          doi = DOI.groups(responseDetails.url)[1]
        }
        let annotationId = this.extractAnnotationId(responseDetails.url)
        if (doi) {
          if (_.isEmpty(redirectUrl.hash)) {
            redirectUrl.hash += '#doi:' + doi
          } else {
            redirectUrl.hash += '&doi:' + doi
          }
        }
        if (annotationId) {
          if (_.isEmpty(redirectUrl.hash)) {
            redirectUrl.hash += '#hag:' + annotationId
          } else {
            redirectUrl.hash += '&hag:' + annotationId
          }
        }
        responseDetails.responseHeaders[locationIndex].value = redirectUrl.toString()
        this.tabs[responseDetails.tabId] = {doi: doi, annotationId: annotationId}
        return {responseHeaders: responseDetails.responseHeaders}
      } catch (e) {
        return {responseHeaders: responseDetails.responseHeaders}
      }
    }, this.doiUrlFilterObject, ['responseHeaders', 'blocking'])
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(ScienceDirect, LINE)
    // Requests to sciencedirect, redirection from linkinghub.elsevier.com (parse doi and hag if present)
    chrome.webRequest.onBeforeSendHeaders.addListener((requestHeaders) => {
      let referer = _.find(requestHeaders.requestHeaders, (requestHeader) => { return requestHeader.name === 'Referer' })
      if (referer && referer.value.includes('linkinghub.elsevier.com')) {
        chrome.tabs.get(requestHeaders.tabId, (tab) => {
          let doi = null
          let annotationId = null
          let url = tab.url
          // Retrieve doi
          let doiGroups = DOI.groups(url)
          if (doiGroups[1]) {
            doi = doiGroups[1]
            doi = doi.split('&hag')[0] // If doi-regex inserts also the hag parameter, remove it, is not part of the doi
          }
          let params = URLUtils.extractHashParamsFromUrl(url)
          if (params && params.hag) {
            annotationId = params.hag
          }
          console.log(requestHeaders)
          if (doi && annotationId) {
            let redirectUrl = requestHeaders.url + '#doi:' + doi + '&hag:' + annotationId
            chrome.tabs.update(requestHeaders.tabId, {url: redirectUrl})
          } else if (doi) {
            let redirectUrl = requestHeaders.url + '#doi:' + doi
            chrome.tabs.update(requestHeaders.tabId, {url: redirectUrl})
          } else if (annotationId) {
            let redirectUrl = requestHeaders.url + '#hag:' + annotationId
            chrome.tabs.update(requestHeaders.tabId, {url: redirectUrl})
          }
        })
      }
    }, this.scienceDirect, ['requestHeaders', 'blocking'])
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Dropbox, LINE)
    // Request to dropbox
    chrome.webRequest.onHeadersReceived.addListener((responseDetails) => {
      this.tabs[responseDetails.tabId] = {
        url: responseDetails.url.split('#')[0],
        annotationId: this.extractAnnotationId(responseDetails.url)
      }
    }, this.dropbox, ['responseHeaders', 'blocking'])
    // Request dropbox pdf files
    chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
      let index = _.findIndex(details.requestHeaders, (header) => { return header.name.toLowerCase() === 'accept' })
      details.requestHeaders[index].value = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
      return {requestHeaders: details.requestHeaders}
    }, this.dropboxContent, ['blocking', 'requestHeaders'])

    chrome.webRequest.onCompleted.addListener((details) => {
      if (this.tabs[details.tabId]) {
        chrome.tabs.sendMessage(details.tabId, this.tabs[details.tabId])
      }
    }, this.dropboxContent)
    // PVSCL:ENDCOND
  }

  extractAnnotationId (url) {
    if (url.includes('#')) {
      let parts = url.split('#')[1].split(':')
      if (parts[0] === 'hag') {
        return parts[1] || null
      }
    } else {
      return null
    }
  }
}

module.exports = TargetManager
