import BrowserStorageManager from './annotationServer/browserStorage/BrowserStorageManager'
import URLUtils from './utils/URLUtils'
import Alerts from './utils/Alerts'
import Config from './Config'
import _ from 'lodash'

class BrowserStorageSearch {
  static init () {
    // Retrieve from params the search
    const query = BrowserStorageSearch.parseParamsToSearch()

    // Set search text input value
    document.querySelector('#searchAnnotationsInput').value = window.location.href.split('#')[1]

    // Retrieve annotations based on params
    window.browserStorageManager = new BrowserStorageManager()
    window.browserStorageManager.init((err) => {
      if (err) {
        Alerts.errorAlert({ text: 'Unable to retrieve annotations list. Error: ' + err.message })
      } else {
        if (_.has(query, 'id')) {
          window.browserStorageManager.client.fetchAnnotation(query.id, (err, annotation) => {
            if (err) {
              Alerts.errorAlert({ text: 'Unable to retrieve annotations. Error: ' + err.message })
            } else {
              BrowserStorageSearch.showAnnotationsOnInterface([annotation])
            }
          })
        } else {
          // Search annotations
          window.browserStorageManager.client.searchAnnotations(query, (err, annotations) => {
            if (err) {
              Alerts.errorAlert({ text: 'Unable to retrieve annotations. Error: ' + err.message })
            } else {
              BrowserStorageSearch.showAnnotationsOnInterface(annotations)
            }
          })
        }
      }
    })
    // Init on enter key to reload the page with new search
    BrowserStorageSearch.setSearchOnEnterClickEventHandler()
  }

  static parseParamsToSearch () {
    return URLUtils.extractHashParamsFromUrl(window.location.href)
  }

  static showAnnotationsOnInterface (annotations = []) {
    annotations.forEach((annotation) => {
      // Clone template
      const annotationCard = document.querySelector('#annotationCardTemplate').content.cloneNode(true)
      annotationCard.id = 'annotationCard_' + annotation.id
      annotationCard.querySelector('.annotationCardUsername').innerText = annotation.creator || annotation.user
      annotationCard.querySelector('.annotationCardUsername').addEventListener('click', () => {
        document.location.href = window.browserStorageManager.constructSearchUrl({ user: annotation.creator || annotation.user })
        document.location.reload()
      })
      annotationCard.querySelector('.annotationCardGroup').innerText = annotation.group
      annotationCard.querySelector('.annotationCardGroup').addEventListener('click', () => {
        document.location.href = window.browserStorageManager.constructSearchUrl({ group: annotation.group })
        document.location.reload()
      })
      annotationCard.querySelector('.annotationCardDate').innerText = annotation.updated
      if (annotation.target && annotation.target[0] && annotation.target[0].selector) {
        annotationCard.querySelector('.annotationCardExact').innerText = annotation.target[0].selector.find((selector) => { return selector.type === 'TextQuoteSelector' }).exact
      }
      if (_.isArray(annotation.body)) {
        const commentBody = annotation.body.find(body => body.purpose === 'commenting')
        if (commentBody) {
          annotationCard.querySelector('.annotationCardComment').innerText = commentBody.value
        } else {
          annotationCard.querySelector('.annotationCardComment').innerText = ''
        }
      }
      annotationCard.querySelector('.annotationCardTags').innerText = JSON.stringify(annotation.tags)
      if (_.isArray(annotation.target) && annotation.target[0]) {
        const source = annotation.target[0].source
        if (_.isObject(source) && source.url) {
          annotationCard.querySelector('.annotationCardLink').querySelector('a').href = source.url + '#' + Config.urlParamName + ':' + annotation.id
        }
      }
      document.querySelector('#searchResult').appendChild(annotationCard)
    })
  }

  static setSearchOnEnterClickEventHandler () {
    document.querySelector('#searchAnnotationsInput').addEventListener('keyup', (event) => {
      if (event.keyCode === 13) {
        // Cancel the default action, if needed
        event.preventDefault()
        // Get element input text
        const queryString = event.target.value
        // TODO Check valid query
        const query = URLUtils.extractHashParamsFromUrl('http://something.com#' + queryString)
        if (_.isObject(query)) {
          // Reload webpage with new query
          document.location.href = window.browserStorageManager.constructSearchUrl(query)
          document.location.reload()
        }
      }
    })
  }
}

BrowserStorageSearch.init()
