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
      q: 'name contains ".' + Config.urlParamName + '" and mimeType = "application/vnd.google-apps.spreadsheet"',
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
      const groupToUpdateIndex = _.findIndex(this.database.groups, (group) => {
        return group.id === id
      })
      if (groupToUpdateIndex > -1) {
        // Retrieve group data
        const groupToUpdate = this.database.groups[groupToUpdateIndex]
        // Update group data
        const updatedGroup = Object.assign(groupToUpdate, data)
        // Update in-memory database
        this.database.groups[groupToUpdateIndex] = updatedGroup
        // TODO Update Storage
        this.manager.saveDatabase(this.database)
        // Callback
        callback(null, updatedGroup)
      } else {
        callback(new Error('Group with ID ' + id + ' does not exist'))
      }
    } else {
      callback(new Error('Required parameter to update the group missing: id'))
    }
  }

  createNewGroup (data, callback) {
    // Copy google sheet using Google Drive API
    this.driveClient = new GoogleDriveClient(this.token)
    this.driveClient.copyFile({ originFileId: '1WA0jjmC7qQdtNfFeBgJcLy2iTO1i_7rEDQNQACC8nv0', metadata: { name: data.name } }, (err, response) => {
      if (err) {
        callback(err)
      } else {
        let group = {
          id: response.id,
          name: response.name + '.' + Config.urlParamName,
          links: 'https://docs.google.com/spreadsheets/d/' + response.id
        }
        callback(null, group)
      }
    }) // TODO parametrize originFieldId

    if (_.has(data, 'name')) {
      const createdGroup = GoogleSheetAnnotationClient.constructGroup({
        name: data.name,
        description: data.description,
        annotationServerUrl: this.manager.annotationServerUrl,
        groups: this.database.groups
      })
      this.database.groups.push(createdGroup)
      // TODO Update Storage
      this.manager.saveDatabase(this.database)
      // Callback
      callback(null, createdGroup)
    } else {
      callback(new Error('Required parameter to create new group missing: name'))
    }
  }

  static constructGroup ({ name, description = '', groups, annotationServerUrl }) {
    // Get a random id
    const arrayOfIds = _.map(groups, 'id')
    const groupId = RandomUtils.randomUnique(arrayOfIds, 8)
    return {
      name: name,
      description: description || '',
      links: { html: annotationServerUrl + '/group/' + groupId },
      id: groupId
    }
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
    if (_.isString(id)) {
      // Remove group from group list
      const removedGroup = _.remove(this.database.groups, (group) => {
        return group.id === id
      })
      // Remove annotations that pertain to the group
      _.remove(this.database.annotations, (annotation) => {
        return annotation.group === id
      })
      if (removedGroup) {
        this.manager.saveDatabase(this.database)
        callback(null, removedGroup)
      } else {
        callback(new Error('The group trying to leave does not exist.'))
      }
    }
  }
}

export default GoogleSheetAnnotationClient
