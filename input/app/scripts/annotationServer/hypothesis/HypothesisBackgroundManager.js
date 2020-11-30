import _ from 'lodash'

class HypothesisBackgroundManager {
  init () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'hypothesisClient') {
        let promise = Promise.resolve()
        // Check if client is initialized correctly, otherwise, reload it again
        if (_.isNull(window.background.hypothesisManager.annotationServerManager.client)) {
          promise = new Promise((resolve) => {
            window.background.hypothesisManager.annotationServerManager.reloadClient(() => {
              resolve()
            })
          })
        }
        promise.then(() => {
          if (request.cmd === 'searchAnnotations') {
            window.background.hypothesisManager.annotationServerManager.client.searchAnnotations(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'getListOfGroups') {
            window.background.hypothesisManager.annotationServerManager.client.getListOfGroups(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'createNewAnnotation') {
            window.background.hypothesisManager.annotationServerManager.client.createNewAnnotation(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'createNewAnnotationsSequential') {
            window.background.hypothesisManager.annotationServerManager.client.createNewAnnotationsSequential(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'createNewAnnotationsParallel') {
            window.background.hypothesisManager.annotationServerManager.client.createNewAnnotationsParallel(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'createNewAnnotations') {
            window.background.hypothesisManager.annotationServerManager.client.createNewAnnotations(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'getUserProfile') {
            window.background.hypothesisManager.annotationServerManager.client.getUserProfile((err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'fetchAnnotation') {
            window.background.hypothesisManager.annotationServerManager.client.fetchAnnotation(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'updateAnnotation') {
            window.background.hypothesisManager.annotationServerManager.client.updateAnnotation(request.data.id, request.data.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'deleteAnnotation') {
            window.background.hypothesisManager.annotationServerManager.client.deleteAnnotation(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'deleteAnnotations') {
            window.background.hypothesisManager.annotationServerManager.client.deleteAnnotations(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'searchAnnotationsSequential') {
            window.background.hypothesisManager.annotationServerManager.client.searchAnnotationsSequential(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'searchBunchAnnotations') {
            window.background.hypothesisManager.annotationServerManager.client.searchBunchAnnotations(request.data.data, request.data.offset, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'createNewGroup') {
            window.background.hypothesisManager.annotationServerManager.client.createNewGroup(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'updateGroup') {
            window.background.hypothesisManager.annotationServerManager.client.updateGroup(request.data.groupId, request.data.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'fetchGroup') {
            window.background.hypothesisManager.annotationServerManager.client.fetchGroup(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'removeAMemberFromAGroup') {
            window.background.hypothesisManager.annotationServerManager.client.removeAMemberFromAGroup(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          }
        })
        return true
      }
    })
  }
}

export default HypothesisBackgroundManager
