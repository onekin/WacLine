import _ from 'lodash'
import BrowserStorageManager from '../browserStorage/BrowserStorageManager'

class GoogleSheetAnnotationBackgroundManager {
  init () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'googleSheetAnnotation') {
        let promise = new Promise((resolve, reject) => {
          window.background.googleSheetAnnotationManager.annotationServerManager.isLoggedIn((err, isLoggedIn) => {
            if (err) {
              reject(err)
            } else {
              if (isLoggedIn) {
                resolve()
              } else {
                window.background.googleSheetAnnotationManager.annotationServerManager.logIn({ interactive: true }, (err) => {
                  if (err) {
                    reject(err)
                  } else {
                    resolve()
                  }
                })
              }
            }
          })
        })
        promise.then(() => {
          if (request.cmd === 'getToken') {
            sendResponse({ token: window.background.googleSheetAnnotationManager.annotationServerManager.googleToken })
          }
          if (request.cmd === 'searchAnnotations') {
            window.background.googleSheetAnnotationManager.annotationServerManager.client.searchAnnotations(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'getListOfGroups') {
            window.background.googleSheetAnnotationManager.annotationServerManager.client.getListOfGroups(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'createNewAnnotation') {
            window.background.googleSheetAnnotationManager.annotationServerManager.client.createNewAnnotation(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'createNewAnnotationsSequential') {
            window.background.googleSheetAnnotationManager.annotationServerManager.client.createNewAnnotationsSequential(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'createNewAnnotationsParallel') {
            window.background.googleSheetAnnotationManager.annotationServerManager.client.createNewAnnotationsParallel(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'createNewAnnotations') {
            window.background.googleSheetAnnotationManager.annotationServerManager.client.createNewAnnotations(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'getUserProfile') {
            window.background.googleSheetAnnotationManager.annotationServerManager.client.getUserProfile((err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'fetchAnnotation') {
            window.background.googleSheetAnnotationManager.annotationServerManager.client.fetchAnnotation(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'updateAnnotation') {
            window.background.googleSheetAnnotationManager.annotationServerManager.client.updateAnnotation(request.data.id, request.data.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'deleteAnnotation') {
            window.background.googleSheetAnnotationManager.annotationServerManager.client.deleteAnnotation(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'deleteAnnotations') {
            window.background.googleSheetAnnotationManager.annotationServerManager.client.deleteAnnotations(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'searchAnnotationsSequential') {
            window.background.googleSheetAnnotationManager.annotationServerManager.client.searchAnnotationsSequential(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'searchBunchAnnotations') {
            window.background.googleSheetAnnotationManager.annotationServerManager.client.searchBunchAnnotations(request.data.data, request.data.offset, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'createNewGroup') {
            window.background.googleSheetAnnotationManager.annotationServerManager.client.createNewGroup(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'updateGroup') {
            window.background.googleSheetAnnotationManager.annotationServerManager.client.updateGroup(request.data.groupId, request.data.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'fetchGroup') {
            window.background.googleSheetAnnotationManager.annotationServerManager.client.fetchGroup(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'removeAMemberFromAGroup') {
            window.background.googleSheetAnnotationManager.annotationServerManager.client.removeAMemberFromAGroup(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'reloadCacheDatabase') {
            window.background.googleSheetAnnotationManager.annotationServerManager.client.reloadCacheDatabase(request.data, (err, result) => {
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

export default GoogleSheetAnnotationBackgroundManager
