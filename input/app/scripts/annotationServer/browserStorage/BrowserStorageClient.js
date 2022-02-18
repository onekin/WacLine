import _ from 'lodash'
import RandomUtils from '../../utils/RandomUtils'
import wildcard from 'wildcard'

class BrowserStorageClient {
  constructor (database, manager) {
    this.database = database
    this.manager = manager
  }

  createNewAnnotation (annotation, callback) {
    try {
      const annotationToStore = BrowserStorageClient.constructAnnotation({
        annotation,
        user: this.database.user,
        annotations: this.database.annotations
      })
      console.debug('Create annotation')
      console.debug(annotationToStore)
      // Store in database
      this.database.annotations.push(annotationToStore)
      // Update storage
      this.manager.saveDatabase(this.database)
      // Callback
      callback(null, annotationToStore)
    } catch (e) {
      callback(e)
    }
  }

  createNewAnnotations (annotations = [], callback) {
    try {
      const toStoreAnnotations = []
      for (let i = 0; i < annotations.length; i++) {
        const annotation = annotations[i]
        const toStoreAnnotation = BrowserStorageClient.constructAnnotation({
          annotation,
          user: this.database.user,
          annotations: this.database.annotations
        })
        toStoreAnnotations.push(toStoreAnnotation)
      }
      // Store in database
      this.database.annotations = this.database.annotations.concat(toStoreAnnotations)
      // Update storage
      this.manager.saveDatabase(this.database)
      callback(null, toStoreAnnotations)
    } catch (e) {
      callback(e)
    }
  }

  static constructAnnotation ({ annotation, user, annotations }) {
    // Check if the required parameter group exists
    if (annotation.group) {
      // TODO Check if annotation follows the standard schema
      let annotationToCreate = BrowserStorageClient.constructEmptyAnnotation()
      // Override properties of annotation with inserted content
      annotationToCreate = Object.assign(annotationToCreate, annotation)

      // UserInfo
      if (_.isEmpty(annotationToCreate.user_info)) {
        annotationToCreate.user_info = { display_name: user.display_name }
      }
      // User
      if (_.isEmpty(annotationToCreate.user)) {
        annotationToCreate.user = user.userid
      }
      // Id
      const arrayOfIds = _.map(annotations, 'id')
      annotationToCreate.id = RandomUtils.randomUnique(arrayOfIds, 22)

      // Permissions
      BrowserStorageClient.setAnnotationPermissions(annotationToCreate, user)
      // TODO Links property ¿?
      // Return constructed annotation to create
      return annotationToCreate
    } else {
      if (_.isEmpty(annotation.group)) {
        throw new Error('Required parameter missing in annotation: group.\n' + annotation.toString())
      } else if (_.isEmpty(annotation.uri)) {
        throw new Error('Required parameter missing in annotation: uri.\n' + annotation.toString())
      }
    }
  }

  static constructEmptyAnnotation () {
    // Get current time
    const now = new Date()
    return {
      updated: now.toISOString(),
      group: '',
      target: [
        {
          source: '',
          selector: []
        }
      ],
      links: {
        json: '',
        html: '',
        incontext: ''
      },
      tags: [],
      text: '',
      created: now.toISOString(),
      flagged: false,
      user_info: {},
      moderation: {
        flagCount: 0
      },
      references: [],
      user: '',
      hidden: false,
      id: '',
      permissions: {}
    }
  }

  searchAnnotations (data = {}, callback) {
    const annotations = this.database.annotations
    let filteredAnnotations = _.filter(annotations, (annotation) => {
      let result = true
      // URL
      if (result && (data.uri || data.url)) {
        if (!_.isEmpty(annotation.target)) {
          // Check if uri exists in any of the source's URIs
          result = !_.isEmpty(_.filter(_.values(annotation.target[0].source), (uri) => {
            return data.url === uri || data.uri === uri
          }))
        } else if (annotation.uri) {
          result = annotation.uri === data.url || annotation.uri === data.uri
        } else {
          result = false
        }
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
      // Uri.parts
      if (result && (data['uri.parts'])) {
        const splittedUri = annotation.uri.split(/[#+/:=?.-]/) // Chars used to split URIs for uri.parts in Hypothes.is https://hyp.is/ajJkEI3pEemPn2ukkpZWjQ/h.readthedocs.io/en/latest/api-reference/v1/
        result = _.some(splittedUri, (str) => { return str === data['uri.parts'] })
      }
      // Wildcard_uri
      if (result && (data.wildcard_uri)) {
        result = wildcard(data.wildcard_uri, annotation.uri)
      }
      // TODO Quote
      // References
      if (result && (data.references)) {
        if (_.isString(data.references)) {
          result = annotation.references.includes(data.references)
        }
      }
      // Text
      if (result && data.text) {
        if (_.isString(data.text)) {
          result = annotation.text.includes(data.text)
        }
      }
      // Any, this is the last one as it is the algorithm with higher computational cost
      if (result && (data.any)) {
        const anyUrl = annotation.uri.includes(data.any) // Any checks in uri
        const anyTag = annotation.tags.includes(data.any) // Any checks in tags
        const anyText = annotation.text.includes(data.text)
        result = anyUrl || anyTag || anyText // TODO Quote
      }
      return result
    })
    if (data.order) {
      const sort = data.sort || 'updated'
      filteredAnnotations = _.orderBy(filteredAnnotations, sort, data.order)
    }
    if (data.limit) {
      filteredAnnotations = _.take(filteredAnnotations, data.limit)
    }
    callback(null, filteredAnnotations)
  }

  static updateAnnotationFromList ({ id, annotation, annotations, currentUser }) {
    const annotationToUpdateIndex = _.findIndex(annotations, (annotationInDatabase) => {
      return annotationInDatabase.id === id
    })
    if (annotationToUpdateIndex > -1) {
      const annotationToUpdate = annotations[annotationToUpdateIndex]
      // Check permissions to delete
      if (_.isArray(annotationToUpdate.permissions.update)) {
        const owner = _.find(annotationToUpdate.permissions.update, (userid) => {
          return userid === currentUser.userid
        })
        if (_.isString(owner)) {
          const annotationUpdated = Object.assign(annotationToUpdate, annotation)
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
          BrowserStorageClient.setAnnotationPermissions(annotationUpdated, currentUser)
          // Update the annotation from list
          annotations[annotationToUpdateIndex] = annotationUpdated
          // Return deleted annotation
          return annotationUpdated
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
        const updatedAnnotation = BrowserStorageClient.updateAnnotationFromList({
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

  static deleteAnnotationFromList ({ id, annotations, currentUser }) {
    const annotationToDeleteIndex = _.findIndex(annotations, (annotation) => {
      return annotation.id === id
    })
    if (annotationToDeleteIndex > -1) {
      const annotation = annotations[annotationToDeleteIndex]
      // Check permissions to delete
      if (_.isArray(annotation.permissions.delete)) {
        const owner = _.find(annotation.permissions.delete, (userid) => {
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
      const deletedAnnotation = BrowserStorageClient.deleteAnnotationFromList({
        id: annotationId,
        annotations: this.database.annotations,
        currentUser: this.database.user
      })
      // TODO Update storage
      this.manager.saveDatabase(this.database)
      // Callback
      callback(null, { deleted: true, id: deletedAnnotation.id })
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
      const deletedAnnotations = []
      for (let i = 0; i < toDeleteAnnotationIds.length; i++) {
        const toDeleteAnnotationId = toDeleteAnnotationIds[i]
        const deletedAnnotation = BrowserStorageClient.deleteAnnotationFromList({
          id: toDeleteAnnotationId,
          annotations: this.database.annotations,
          currentUser: this.database.user
        })
        deletedAnnotations.push(deletedAnnotation)
      }
      // TODO Update Storage
      this.manager.saveDatabase(this.database)
      // Callback
      callback(null, { deleted: true, annotations: deletedAnnotations })
    } catch (e) {
      callback(e)
    }
  }

  fetchAnnotation (id, callback) {
    if (_.isString(id)) {
      const foundAnnotation = _.find(this.database.annotations, (annotation) => {
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
    const groups = _.map(this.database.groups, (group) => {
      return {
        id: group.id,
        name: group.name,
        links: group.links
      }
    })
    callback(null, groups)
  }

  getUserProfile (callback) {
    const profile = this.database.user
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
    if (_.has(data, 'name')) {
      const createdGroup = BrowserStorageClient.constructGroup({
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

export default BrowserStorageClient
