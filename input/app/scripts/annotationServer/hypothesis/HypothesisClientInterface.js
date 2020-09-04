import _ from 'lodash'

class HypothesisClientInterface {

  static sendCallToBackground (cmd, data, callback) {
    chrome.runtime.sendMessage({
      scope: 'hypothesisClient',
      cmd: cmd,
      data: data
    }, (result) => {
      if (_.has(result, 'error')) {
        callback(result.error)
      } else {
        callback(null, result)
      }
    })
  }

  /**
   * Giving an annotation data, it is created in Hypothes.is
   * @param data Annotation {@link https://h.readthedocs.io/en/latest/api-reference/#operation/createAnnotation body schema}
   * @param callback Function to execute after annotation creation
   */
  createNewAnnotation (data, callback) {
    HypothesisClientInterface.sendCallToBackground('createNewAnnotation', data, callback)
  }

  /**
   * Creates in hypothes.is server sequentially a given list of annotations
   * @param annotations A list of annotation bodies
   * @param callback Function to execute after annotations are created
   * @return progress Holds progress of creating process, current and max values in number of pending annotations to finish.
   */
  createNewAnnotationsSequential (annotations, callback) {
    HypothesisClientInterface.sendCallToBackground('createNewAnnotationsSequential', annotations, callback)
  }

  /**
   * Create a list of annotations in parallel
   * @param annotations A list of annotation bodies
   * @param callback Function to execute after annotations are created
   */
  createNewAnnotationsParallel (annotations, callback) {
    HypothesisClientInterface.sendCallToBackground('createNewAnnotationsParallel', annotations, callback)
  }

  /**
   * Given an array of annotations creates them in the hypothes.is server
   * @param annotations
   * @param callback
   */
  createNewAnnotations (annotations, callback) {
    HypothesisClientInterface.sendCallToBackground('createNewAnnotations', annotations, callback)
  }

  /**
   * Returns users profile
   * @param callback
   */
  getUserProfile (callback) {
    HypothesisClientInterface.sendCallToBackground('getUserProfile', {}, callback)
  }

  /**
   * Fetches an annotation by id
   * @param id
   * @param callback
   */
  fetchAnnotation (id, callback) {
    HypothesisClientInterface.sendCallToBackground('fetchAnnotation', id, callback)
  }

  /**
   * Updates the annotation with
   * @param id
   * @param data
   * @param callback
   */
  updateAnnotation (id, data, callback) {
    HypothesisClientInterface.sendCallToBackground('updateAnnotation', { data: data, id: id }, callback)
  }

  /**
   * Given an annotation or annotation id string, it deletes from Hypothes.is
   * @param annotation
   * @param callback
   */
  deleteAnnotation (annotation, callback) {
    HypothesisClientInterface.sendCallToBackground('deleteAnnotation', annotation, callback)
  }

  /**
   * Given a list of annotations or annotation ids, they are deleted in Hypothes.is
   * @param annotations a list of annotations or list of strings with each id
   * @param callback
   */
  deleteAnnotations (annotations, callback) {
    HypothesisClientInterface.sendCallToBackground('deleteAnnotations', annotations, callback)
  }

  /**
   * Search bulk annotations sequentially using search_after instead of offset
   * @param data
   * @param callback
   * @return {{current: number, max: number}} Holds progress of searching process, current and max values in number of queries pending to finish the search.
   */
  searchAnnotationsSequential (data, callback) {
    HypothesisClientInterface.sendCallToBackground('searchAnnotationsSequential', data, callback)
  }

  /**
   * Given a list of annotations, it ordered them by sort and in desc or asc order
   * @param annotations
   * @param order
   * @param sort
   * @return {Array}
   */
  static orderAnnotations (annotations, order = 'desc', sort = 'updated') {
    // Only created or updated allowed: See: https://h.readthedocs.io/en/latest/api-reference/#operation/search
    if (sort !== 'updated' || sort !== 'created') {
      sort = 'updated'
    }
    return _.orderBy(annotations, [sort], order)
  }

  /**
   * Search annotations
   * @param data
   * @param callback
   */
  searchAnnotations (data, callback) {
    HypothesisClientInterface.sendCallToBackground('searchAnnotations', data, callback)
  }

  searchBunchAnnotations (data, offset, callback) {
    HypothesisClientInterface.sendCallToBackground('searchBunchAnnotations', { data, offset }, callback)
  }

  /**
   * Get list of groups for current user
   * @param data
   * @param callback
   */
  getListOfGroups (data, callback) {
    HypothesisClientInterface.sendCallToBackground('getListOfGroups', data, callback)
  }

  /**
   * Create a new, private group for the currently-authenticated user.
   * @param data Check the body request schema in https://h.readthedocs.io/en/latest/api-reference/#operation/createGroup
   * @param callback
   */
  createNewGroup (data, callback) {
    HypothesisClientInterface.sendCallToBackground('createNewGroup', data, callback)
  }

  /**
   * Update a group metadata: name, description or id (only for Authorities). Check: https://h.readthedocs.io/en/latest/api-reference/#tag/groups/paths/~1groups~1{id}/patch
   * @param groupId
   * @param data
   * @param callback
   */
  updateGroup (groupId, data, callback) {
    HypothesisClientInterface.sendCallToBackground('updateGroup', { groupId, data }, callback)
  }

  /**
   * Retrieve a group data by its ID
   * @param groupId
   * @param callback
   */
  fetchGroup (groupId, callback) {
    HypothesisClientInterface.sendCallToBackground('fetchGroup', groupId, callback)
  }

  /**
   * Remove a member from a Hypothes.is group. Currently only is allowed to remove yourself.
   * @param data
   * @param callback
   */
  removeAMemberFromAGroup (data, callback) {
    HypothesisClientInterface.sendCallToBackground('removeAMemberFromAGroup', data, callback)
  }
}


export default HypothesisClientInterface
