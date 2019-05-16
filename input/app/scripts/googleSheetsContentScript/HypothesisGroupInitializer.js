const _ = require('lodash')
const swal = require('sweetalert2')
const Alerts = require('../utils/Alerts')
const ChromeStorage = require('../utils/ChromeStorage')
const Config = require('../Config')
const Hypothesis = require('../storage/Hypothesis')
const selectedGroupNamespace = 'hypothesis.currentGroup'

class HypothesisGroupInitializer {
  init (annotationGuide, callback) {
    this.annotationGuide = annotationGuide
    this.initializeHypothesisGroup((err) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        if (_.isFunction(callback)) {
          callback()
        }
      }
    })
  }

  initializeHypothesisGroup (callback) {
    // Get if current hypothesis group exists
    window.hag.hypothesisClientManager.hypothesisClient.getListOfGroups({}, (err, groups) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        let group = _.find(groups, (group) => {
          return group.name === Config.groupName
        })
        // Create the group if not exists
        if (_.isEmpty(group)) {
          this.createHypothesisGroup((err) => {
            if (err) {
              swal('Oops!', // TODO i18n
                'There was a problem while creating the hypothes.is group. Please reload the page and try it again. <br/>' +
                'If the error continues, please contact administrator.',
                'error') // Show to the user the error
              if (_.isFunction(callback)) {
                callback(err)
              }
            } else {
              this.createFacetsAndCodes((err) => {
                if (err) {
                  swal('Oops!', // TODO i18n
                    'There was a problem while creating buttons for the sidebar. Please reload the page and try it again. <br/>' +
                    'If the error continues, please contact the administrator.',
                    'error') // Show to the user the error
                  // Remove created hypothesis group
                  this.removeGroup()
                  if (_.isFunction(callback)) {
                    callback(err)
                  }
                } else {
                  // Save as current group the generated one
                  ChromeStorage.setData(selectedGroupNamespace, {data: JSON.stringify(this.annotationGuide.storage.group)}, ChromeStorage.local)
                  // When window.focus
                  let groupUrl = this.annotationGuide.storage.group.links.html
                  Alerts.successAlert({
                    title: 'Correctly configured', // TODO i18n
                    text: chrome.i18n.getMessage('ShareHypothesisGroup') + '<br/><a href="' + groupUrl + '" target="_blank">' + groupUrl + '</a>'
                  })
                  if (_.isFunction(callback)) {
                    callback()
                  }
                }
              })
            }
          })
        } else {
          swal('The group ' + group.name + ' already exists', // TODO i18n
            chrome.i18n.getMessage('ShareHypothesisGroup') + '<br/><a href="' + group.url + '" target="_blank">' + group.url + '</a>',
            'info')
          if (_.isFunction(callback)) {
            callback()
          }
          // TODO Update Hypothesis group
        }
      }
    })
  }

  createHypothesisGroup (callback) {
    window.hag.hypothesisClientManager.hypothesisClient.createNewGroup({name: this.annotationGuide.name}, (err, group) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        console.debug('Created group in hypothesis: ')
        console.debug(group)
        let storage = new Hypothesis({
          group: group
        })
        this.annotationGuide.storage = storage
        if (_.isFunction(callback)) {
          callback()
        }
      }
    })
  }

  createFacetsAndCodes (callback) {
    let annotations = this.annotationGuide.toAnnotations()
    console.debug('Generated dimensions and categories annotations: ')
    console.debug(annotations)
    window.hag.hypothesisClientManager.hypothesisClient.createNewAnnotations(annotations, (err) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        if (_.isFunction(callback)) {
          callback()
        }
      }
    })
  }

  removeGroup (callback) {
    if (this.annotationGuide.storage) {
      window.hag.hypothesisClientManager.hypothesisClient.removeAMemberFromAGroup(this.annotationGuide.storage.group.id, 'me', (err) => {
        if (_.isFunction(callback)) {
          callback(err)
        } else {
          callback()
        }
      })
    }
  }
}

module.exports = HypothesisGroupInitializer
