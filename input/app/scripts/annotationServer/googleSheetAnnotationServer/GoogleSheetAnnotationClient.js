import _ from 'lodash'
import RandomUtils from '../../utils/RandomUtils'
import wildcard from 'wildcard'
import GoogleDriveClient from '../../googleDrive/GoogleDriveClient'
import Config from '../../Config'

class GoogleSheetAnnotationClient {
  constructor (token, manager) {
    this.token = token
    this.manager = manager
  }

  createNewAnnotation (annotation, callback) {

  }

  createNewAnnotations (annotations = [], callback) {

  }

  static constructAnnotation ({ annotation, user, annotations }) {

  }

  static constructEmptyAnnotation () {

  }

  searchAnnotations (data = {}, callback) {

  }

  static updateAnnotationFromList ({ id, annotation, annotations, currentUser }) {

  }

  updateAnnotation (id, annotation, callback) {

  }

  static deleteAnnotationFromList ({ id, annotations, currentUser }) {

  }

  deleteAnnotation (id, callback) {

  }

  deleteAnnotations (annotationsArray, callback) {

  }

  fetchAnnotation (id, callback) {

  }

  getListOfGroups (data, callback) { // TODO Check if data can be removed
    this.driveClient = new GoogleDriveClient(this.token)
    this.driveClient.listFiles({
      q: 'appProperties has {key="wacline" and value="' + Config.urlParamName + '"} and mimeType = "application/vnd.google-apps.spreadsheet" and trashed = false',
      supportsAllDrives: true // Search in user's drive and shared ones
    }, (err, list) => {
      if (err) {
        callback(err)
      } else {
        let groups = list.map(elem => {
          return {
            id: elem.id,
            name: elem.name,
            links: 'https://docs.google.com/spreadsheets/d/' + elem.id,
            description: '',
            url: 'https://docs.google.com/spreadsheets/d/' + elem.id
          }
        })
        callback(null, groups)
      }
    })
  }

  getUserProfile (callback) {
    chrome.identity.getProfileUserInfo((data) => {
      this.getListOfGroups({}, (err, groups) => {
        if (err) {
          callback(err)
        } else {
          let profile = {
            userid: data.email,
            display_name: data.email // TODO Get google's name if possible
          }
          profile.groups = groups
          callback(null, profile)
        }
      })
    })
  }

  updateGroup (id, data, callback) {
    if (_.isString(id)) {
      // Copy google sheet using Google Drive API
      this.driveClient = new GoogleDriveClient(this.token)
      this.driveClient.updateFile(id, {
        name: data.name,
        appProperties: { wacline: Config.urlParamName }
      }, (err, response) => {
        if (err) {
          callback(err)
        } else {
          let group = {
            id: response.id,
            name: response.name,
            links: 'https://docs.google.com/spreadsheets/d/' + response.id
          }
          callback(null, group)
        }
      })
    } else {
      callback(new Error('Required parameter to update the group missing: id'))
    }
  }

  createNewGroup (data, callback) {
    // Copy google sheet using Google Drive API
    this.driveClient = new GoogleDriveClient(this.token)
    this.driveClient.copyFile({
      originFileId: '1WA0jjmC7qQdtNfFeBgJcLy2iTO1i_7rEDQNQACC8nv0',
      data: {
        name: data.name,
        appProperties: { wacline: Config.urlParamName }
      }
    }, (err, response) => {
      if (err) {
        callback(err)
      } else {
        let group = {
          id: response.id,
          name: response.name,
          links: 'https://docs.google.com/spreadsheets/d/' + response.id
        }
        callback(null, group)
      }
    }) // TODO parametrize originFieldId
  }

  static setAnnotationPermissions (annotation, currentUser) {
    annotation.permissions = annotation.permissions || {}
    if (_.isEmpty(annotation.permissions.read)) {
      annotation.permissions.read = [currentUser.userid]
    }
    if (_.isEmpty(annotation.permissions.admin)) {
      annotation.permissions.admin = [currentUser.userid]
    }
    if (_.isEmpty(annotation.permissions.delete)) {
      annotation.permissions.delete = [currentUser.userid]
    }
    if (_.isEmpty(annotation.permissions.update)) {
      annotation.permissions.update = [currentUser.userid]
    }
  }

  removeAMemberFromAGroup ({ id, user = null }, callback) {
    // Copy google sheet using Google Drive API
    this.driveClient = new GoogleDriveClient(this.token)
    this.driveClient.trashFile(id, (err, result) => {
      if (err) {
        callback(new Error('Unable to trash spreadsheet, only the owner is able to do it. If you want to delete the file from this tool go to Google Drive and remove yourself from sharing options: https://docs.google.com/spreadsheets/d/' + id))
      } else {
        callback(null, result)
      }
    })
  }
}

export default GoogleSheetAnnotationClient
