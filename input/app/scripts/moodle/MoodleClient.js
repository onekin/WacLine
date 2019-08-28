const _ = require('lodash')
const axios = require('axios')
const jsonFormData = require('json-form-data')

class MoodleClient {
  constructor (endpoint, token) {
    this.endpoint = endpoint
    this.token = token
  }

  updateToken (token) {
    this.token = token
  }

  updateEndpoint (endpoint) {
    this.endpoint = endpoint
  }

  init () {

  }

  getRubric (cmids, callback) {
    let settings = {
      'async': true,
      'crossDomain': true,
      'url': this.endpoint + '/webservice/rest/server.php?',
      'params': {
        'wstoken': this.token,
        'wsfunction': 'core_grading_get_definitions',
        'areaname': 'submissions',
        'cmids[0]': cmids,
        'moodlewsrestformat': 'json',
        'activeonly': 0
      },
      'method': 'GET',
      'headers': {
        'Cache-Control': 'no-cache'
      }
    }
    axios(settings).then((response) => {
      if (_.isFunction(callback)) {
        callback(null, response.data)
      }
    })
  }

  getCmidInfo (cmid, callback) {
    let data = {cmid: cmid}
    let settings = {
      'async': true,
      'crossDomain': true,
      'url': this.endpoint + 'webservice/rest/server.php?',
      'method': 'POST',
      'params': {
        'wstoken': this.token,
        'wsfunction': 'core_course_get_course_module',
        'moodlewsrestformat': 'json'
      },
      'headers': {
        'cache-control': 'no-cache',
        'Content-Type': 'multipart/form-data'
      },
      'processData': false,
      'contentType': false,
      'mimeType': 'multipart/form-data',
      'data': data,
      'transformRequest': [(data) => {
        return jsonFormData(data)
      }]
    }
    axios(settings).then((response) => {
      if (_.isFunction(callback)) {
        callback(null, response.data)
      }
    })
  }

  updateStudentGradeWithRubric (data, callback) {
    let settings = {
      'async': true,
      'crossDomain': true,
      'url': this.endpoint + '/webservice/rest/server.php?',
      'method': 'POST',
      'headers': {
        'Cache-Control': 'no-cache',
        'Content-Type': 'multipart/form-data'
      },
      'params': {
        'wstoken': this.token,
        'wsfunction': 'mod_assign_save_grade',
        'moodlewsrestformat': 'json'
      },
      'data': data,
      'transformRequest': [(data) => {
        return jsonFormData(data)
      }]
    }
    axios(settings).then((response) => {
      callback(null, response.data)
    })
  }

  getStudents (courseId, callback) {
    let settings = {
      'async': true,
      'crossDomain': true,
      'url': this.endpoint + '/webservice/rest/server.php?',
      'params': {
        'wstoken': this.token,
        'wsfunction': 'core_enrol_get_enrolled_users',
        'courseid': courseId,
        'moodlewsrestformat': 'json'
      },
      'method': 'GET',
      'headers': {
        'Cache-Control': 'no-cache'
      }
    }
    axios(settings).then((response) => {
      if (_.isFunction(callback)) {
        callback(null, response.data)
      }
    })
  }
}

module.exports = MoodleClient
