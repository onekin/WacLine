const _ = require('lodash')
const RandomUtils = require('../../utils/RandomUtils')
const wildcard = require('wildcard')

class LocalStorageClient {
  constructor (database, manager) {
    this.database = database
    this.manager = manager
  }

  createNewAnnotation (annotation, callback) {
    try {
      let annotationToStore = LocalStorageClient.constructAnnotation({
        annotation,
        user: this.database.user,
        annotations: this.database.annotations
      })
      console.debug('Create annotation')
      console.debug(annotationToStore)
      // Store in database
      this.database.annotations.push(annotationToStore)
      // TODO Update storage
      this.manager.saveDatabase(this.database)
      // Callback
      callback(null, annotationToStore)
    } catch (e) {
      callback(e)
    }
  }

  createNewAnnotations (annotations = [], callback) {
    try {
      let toStoreAnnotations = []
      for (let i = 0; i < annotations.length; i++) {
        let annotation = annotations[i]
        let toStoreAnnotation = LocalStorageClient.constructAnnotation({
          annotation,
          user: this.database.user,
          annotations: this.database.annotations
        })
        toStoreAnnotations.push(toStoreAnnotation)
      }
      // Store in database
      this.database.annotations = this.database.annotations.concat(toStoreAnnotations)
      // TODO Update storage
      this.manager.saveDatabase(this.database)
      callback(null, toStoreAnnotations)
    } catch (e) {
      callback(e)
    }
  }

  static constructAnnotation ({annotation, user, annotations}) {
    // Check if the required parameter uri exists
    if (annotation.uri) {
      // TODO Check if annotation follows the standard schema
      let annotationToCreate = LocalStorageClient.constructEmptyAnnotation()
      // Override properties of annotation with inserted content
      annotationToCreate = Object.assign(annotationToCreate, annotation)

      // Append required params but not added in annotation (groupid, user, etc.)
      if (_.isEmpty(annotationToCreate.group)) {
        annotationToCreate.group = '__world__'
      }
      // UserInfo
      if (_.isEmpty(annotationToCreate.user_info)) {
        annotationToCreate.user_info = {display_name: user.display_name}
      }
      // User
      if (_.isEmpty(annotationToCreate.user)) {
        annotationToCreate.user = user.userid
      }
      // Id
      let arrayOfIds = _.map(annotations, 'id')
      annotationToCreate.id = RandomUtils.randomUnique(arrayOfIds, 22)

      // Permissions
      annotationToCreate.permissions = annotationToCreate.permissions || {}
      if (_.isEmpty(annotationToCreate.permissions.read)) {
        annotationToCreate.permissions.read = [user.userid]
      }
      if (_.isEmpty(annotationToCreate.permissions.admin)) {
        annotationToCreate.permissions.admin = [user.userid]
      }
      if (_.isEmpty(annotationToCreate.permissions.delete)) {
        annotationToCreate.permissions.delete = [user.userid]
      }
      if (_.isEmpty(annotationToCreate.permissions.update)) {
        annotationToCreate.permissions.update = [user.userid]
      }
      // TODO Links property ¿?
      // Return constructed annotation to create
      return annotationToCreate
    } else {
      throw new Error('Required parameter missing in annotation: uri.\n' + annotation.toString())
    }
  }

  static constructEmptyAnnotation () {
    // Get current time
    let now = new Date()
    return {
      'updated': now.toISOString(),
      'group': '',
      'target': [
        {
          'source': '',
          'selector': []
        }
      ],
      'links': {
        'json': '',
        'html': '',
        'incontext': ''
      },
      'tags': [],
      'text': '',
      'created': now.toISOString(),
      'uri': '',
      'flagged': false,
      'user_info': {},
      'moderation': {
        'flagCount': 0
      },
      'references': [],
      'user': '',
      'hidden': false,
      'document': {},
      'id': '',
      'permissions': {}
    }
  }

  searchAnnotations (data = {}, callback) {
    let annotations = this.database.annotations
    let filteredAnnotations = _.filter(annotations, (annotation) => {
      let result = true
      // URL
      if (result && (data.uri || data.url)) {
        result = annotation.uri === data.url || annotation.uri === data.uri
      }
      // User
      if (result && (data.user)) {
        result = annotation.user === data.user
      }
      // Group
      if (result && (data.group)) {
        result = annotation.group === data.group
      }
      // Tags
      if (result && (data.tag || data.tags)) {
        let tags = []
        if (_.isArray(data.tags) && _.every(data.tags, _.isString)) {
          tags = data.tags
        }
        if (_.isString(data.tags)) {
          tags.push(data.tags)
        }
        if (_.isString(data.tag)) {
          tags.push(data.tag)
        }
        // Remove duplicated tags
        tags = _.uniq(tags)
        // Check if annotation's tags includes all the annotations
        result = tags.length === _.intersection(annotation.tags, tags).length
      }
      // TODO Uri.parts
      if (result && (data['uri.parts'])) {
        let splittedUri = annotation.uri.split(/[#+/:=?.-]/) // Chars used to split URIs for uri.parts in Hypothes.is https://hyp.is/ajJkEI3pEemPn2ukkpZWjQ/h.readthedocs.io/en/latest/api-reference/v1/
        result = _.some(splittedUri, (str) => { return str === data['uri.parts'] })
      }
      // TODO wildcard_uri
      if (result && (data.wildcard_uri)) {
        result = wildcard(data.wildcard_uri, annotation.uri)
      }
      // TODO Any
      if (result && (data.any)) {
        let anyUrl = annotation.uri.includes(data.any) // Any checks in uri
        let anyTag = annotation.tags.includes(data.any) // Any checks in tags
        result = anyUrl || anyTag // TODO Quote and text
      }
      // TODO Quote
      // TODO References
      if (result && (data.references)) {
        if (_.isString(data.references)) {
          result = annotation.references.includes(data.references)
        }
      }
      // TODO Text
      return result
    })
    if (data.order) {
      let sort = data.sort || 'updated'
      filteredAnnotations = _.orderBy(filteredAnnotations, sort, data.order)
    }
    if (data.limit) {
      filteredAnnotations = _.take(filteredAnnotations, data.limit)
    }
    callback(null, filteredAnnotations)
  }

  static updateAnnotationFromList ({id, annotation, annotations, currentUser}) {
    let annotationToUpdateIndex = _.findIndex(annotations, (annotationInDatabase) => {
      return annotationInDatabase.id === id
    })
    if (annotationToUpdateIndex > -1) {
      let annotationToUpdate = annotations[annotationToUpdateIndex]
      // Check permissions to delete
      if (_.isArray(annotationToUpdate.permissions.update)) {
        let owner = _.find(annotationToUpdate.permissions.update, (userid) => {
          return userid === currentUser.userid
        })
        if (_.isString(owner)) {
          let annotationUpdated = Object.assign(annotationToUpdate, annotation)
          // Update updated time
          annotationUpdated.updated = (new Date()).toISOString()
          // Update url in target if changed
          if (annotationToUpdate.uri !== annotation.uri) {
            _.forEach(annotationUpdated.target, (target, index) => {
              if (annotationUpdated.target[index]) {
                annotationUpdated.target[index].source = annotation.uri
              }
            })
          }
          // Permissions
          annotationUpdated.permissions = annotationUpdated.permissions || {}
          if (_.isEmpty(annotationUpdated.permissions.read)) {
            annotationUpdated.permissions.read = [currentUser.userid]
          }
          if (_.isEmpty(annotationUpdated.permissions.admin)) {
            annotationUpdated.permissions.admin = [currentUser.userid]
          }
          if (_.isEmpty(annotationUpdated.permissions.delete)) {
            annotationUpdated.permissions.delete = [currentUser.userid]
          }
          if (_.isEmpty(annotationUpdated.permissions.update)) {
            annotationUpdated.permissions.update = [currentUser.userid]
          }
          // Update the annotation from list
          annotations[annotationToUpdateIndex] = annotationUpdated
          // Return deleted annotation
          return annotation
        } else {
          // Your are not the owner
          throw new Error('Your are not the owner of the annotation ID: ' + id)
        }
      }
    } else {
      throw new Error('Annotation with ID ' + id + ' does not exist')
    }
  }

  updateAnnotation (id, annotation, callback) {
    if (_.isString(id) && _.isObject(annotation)) {
      try {
        let updatedAnnotation = LocalStorageClient.updateAnnotationFromList({
          id: id,
          annotation: annotation,
          annotations: this.database.annotations,
          currentUser: this.database.user
        })
        // TODO Update storage
        this.manager.saveDatabase(this.database)
        callback(null, updatedAnnotation)
      } catch (e) {
        callback(e)
      }
    }
  }

  static deleteAnnotationFromList ({id, annotations, currentUser}) {
    let annotationToDeleteIndex = _.findIndex(annotations, (annotation) => {
      return annotation.id === id
    })
    if (annotationToDeleteIndex > -1) {
      let annotation = annotations[annotationToDeleteIndex]
      // Check permissions to delete
      if (_.isArray(annotation.permissions.delete)) {
        let owner = _.find(annotation.permissions.delete, (userid) => {
          return userid === currentUser.userid
        })
        if (_.isString(owner)) {
          // Delete the annotation from list
          annotations.splice(annotationToDeleteIndex, 1)
          // Return deleted annotation
          return annotation
        } else {
          // Your are not the owner
          throw new Error('Your are not the owner of the annotation ID: ' + id)
        }
      }
    } else {
      throw new Error('Annotation with ID ' + id + ' does not exist')
    }
  }

  deleteAnnotation (id, callback) {
    let annotationId
    if (_.isObject(id) && _.has(id, 'id')) {
      annotationId = id.id
    } else if (_.isString(id)) {
      annotationId = id
    } else {
      callback(new Error('The param id is not an annotation or the ID of an annotation'))
      return
    }
    try {
      let deletedAnnotation = LocalStorageClient.deleteAnnotationFromList({
        id: annotationId,
        annotations: this.database.annotations,
        currentUser: this.database.user
      })
      // TODO Update storage
      this.manager.saveDatabase(this.database)
      // Callback
      callback(null, {deleted: true, annotation: deletedAnnotation})
    } catch (e) {
      callback(e)
    }
  }

  deleteAnnotations (annotationsArray, callback) {
    let toDeleteAnnotationIds
    if (_.every(annotationsArray, (annotation) => { return annotation.id })) {
      toDeleteAnnotationIds = _.map(annotationsArray, 'id')
    } else if (_.every(annotationsArray, String)) {
      toDeleteAnnotationIds = annotationsArray
    } else {
      callback(new Error('The annotations array is not an array of annotations or an array of strings'))
      return
    }
    try {
      let deletedAnnotations = []
      for (let i = 0; i < toDeleteAnnotationIds.length; i++) {
        let toDeleteAnnotationId = toDeleteAnnotationIds[i]
        let deletedAnnotation = LocalStorageClient.deleteAnnotationFromList({
          id: toDeleteAnnotationId,
          annotations: this.database.annotations,
          currentUser: this.database.user
        })
        deletedAnnotations.push(deletedAnnotation)
      }
      // TODO Update Storage
      this.manager.saveDatabase(this.database)
      // Callback
      callback(null, {deleted: true, annotations: deletedAnnotations})
    } catch (e) {
      callback(e)
    }
  }

  fetchAnnotation (id, callback) {
    if (_.isString(id)) {
      let foundAnnotation = _.find(this.database.annotations, (annotation) => {
        return annotation.id === id
      })
      if (_.isObject(foundAnnotation)) {
        // TODO Check if has reading permissions
        // Callback
        callback(null, foundAnnotation)
      } else {
        callback(new Error('Annotation with ID ' + id + ' not found'))
      }
    } else {
      callback(id)
    }
  }

  getListOfGroups (data, callback) {
    let groups = _.map(this.database.groups, (group) => {
      return {
        id: group.id,
        name: group.name,
        links: group.links
      }
    })
    callback(null, groups)
  }

  getUserProfile (callback) {
    let profile = this.database.user
    // Retrieve groups and parse
    profile.groups = _.map(this.database.groups, (group) => {
      return {
        name: group.name,
        description: group.description,
        id: group.id,
        url: group.links.html
      }
    })
    callback(null, profile)
  }

  updateGroup (id, data, callback) {
    if (_.isString(id)) {
      let groupToUpdateIndex = _.findIndex(this.database.groups, (group) => {
        return group.id === id
      })
      if (groupToUpdateIndex > -1) {
        // Retrieve group data
        let groupToUpdate = this.database.groups[groupToUpdateIndex]
        // Update group data
        let updatedGroup = Object.assign(groupToUpdate, data)
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
    if (_.has(data, 'name')) {
      let createdGroup = LocalStorageClient.constructGroup({
        name: data.name,
        description: data.description,
        storageUrl: this.manager.storageUrl,
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

  static constructGroup ({name, description = '', groups, storageUrl}) {
    // Get a random id
    let arrayOfIds = _.map(groups, 'id')
    let groupId = RandomUtils.randomUnique(arrayOfIds, 8)
    return {
      name: name,
      description: description || '',
      links: {html: storageUrl + '/groups/' + groupId},
      id: groupId
    }
  }
}

module.exports = LocalStorageClient
