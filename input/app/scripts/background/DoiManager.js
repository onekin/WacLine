const DOI = require('doi-regex')
const URLUtils = require('../utils/URLUtils')
const _ = require('lodash')

class DoiManager {
  constructor () {
    this.doiUrlFilterObject = { 'urls': ['*://*.doi.org/*', '*://doi.org/*'] }
    this.scienceDirect = { 'urls': ['*://www.sciencedirect.com/science/article/pii/*'] }
    this.dropbox = {'urls': ['*://www.dropbox.com/s/*?raw=1*']}
    this.dropboxContent = {'urls': ['*://*.dropboxusercontent.com/*']}
  }

  init () {
    // Requests to doi.org
    chrome.webRequest.onHeadersReceived.addListener((responseDetails) => {
      console.log(responseDetails)
      // Retrieve doi from call
      let doi = DOI.groups(responseDetails.url)[1]
      // TODO Substitute by URLUtils.extractHashParamsFromUrl(window.location.href)
      let annotationId = this.extractAnnotationId(responseDetails.url)
      let redirectUrl = responseDetails.responseHeaders[2].value
      redirectUrl += '#doi:' + doi
      if (annotationId) {
        redirectUrl += '&hag:' + annotationId
      }
      responseDetails.responseHeaders[2].value = redirectUrl
      return {responseHeaders: responseDetails.responseHeaders}
    }, this.doiUrlFilterObject, ['responseHeaders', 'blocking'])
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
    // Request to dropbox
    chrome.webRequest.onHeadersReceived.addListener((responseDetails) => {
      let redirectUrl = _.find(responseDetails.responseHeaders, (header) => { return header.name.toLowerCase() === 'location' }).value
      let index = _.findIndex(responseDetails.responseHeaders, (header) => { return header.name.toLowerCase() === 'location' })
      redirectUrl += '#url::' + responseDetails.url.split('#')[0] // Get only the url of the document
      let annotationId = this.extractAnnotationId(responseDetails.url)
      if (annotationId) {
        redirectUrl += '&hag:' + annotationId
      }
      responseDetails.responseHeaders[index].value = redirectUrl
      return {responseHeaders: responseDetails.responseHeaders}
    }, this.dropbox, ['responseHeaders', 'blocking'])
    // Request dropbox pdf files
    chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
      let index = _.findIndex(details.requestHeaders, (header) => { return header.name.toLowerCase() === 'accept' })
      details.requestHeaders[index].value = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
      return {requestHeaders: details.requestHeaders}
    }, this.dropboxContent, ['blocking', 'requestHeaders'])
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

module.exports = DoiManager
