const _ = require('lodash')
const swal = require('sweetalert2')
const Alerts = require('../utils/Alerts')
const ChromeStorage = require('../utils/ChromeStorage')
const AnnotationGuide = require('../definition/AnnotationGuide')
const selectedGroupNamespace = 'hypothesis.currentGroup'
// PVSCL:IFCOND(ApplicationBased, LINE)
const Config = require('../Config')
// PVSCL:ENDCOND

class GroupInitializer {
  init (annotationGuide, callback) {
    this.annotationGuide = annotationGuide
    this.initializeGroup((err) => {
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

  initializeGroup (callback) {
    // Get if current hypothesis group exists
    window.hag.storageManager.client.getListOfGroups({}, (err, groups) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        let group = _.find(groups, (group) => {
          let isGroupNameEqual
          // PVSCL:IFCOND(ApplicationBased, LINE)
          isGroupNameEqual = group.name === Config.groupName
          // PVSCL:ENDCOND
          // PVSCL:IFCOND(Manual, LINE)
          isGroupNameEqual = group.name === this.annotationGuide.name.substr(0, 25)
          // PVSCL:ENDCOND
          return isGroupNameEqual
        })
        // Create the group if not exists
        if (_.isEmpty(group)) {
          this.createGroup((err) => {
            if (err) {
              swal('Oops!', // TODO i18n
                'There was a problem while creating the group. Please reload the page and try it again. <br/>' +
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

  createGroup (callback) {
    window.hag.storageManager.client.createNewGroup({name: this.annotationGuide.name}, (err, group) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        console.debug('Created group in hypothesis: ')
        console.debug(group)
        AnnotationGuide.setStorage(group, (storage) => {
          this.annotationGuide.storage = storage
          if (_.isFunction(callback)) {
            callback()
          }
        })
      }
    })
  }

  createFacetsAndCodes (callback) {
    let annotations = this.annotationGuide.toAnnotations()
    console.debug('Generated dimensions and categories annotations: ')
    console.debug(annotations)
    window.hag.storageManager.client.createNewAnnotations(annotations, (err) => {
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
      window.hag.storageManager.client.removeAMemberFromAGroup(this.annotationGuide.storage.group.id, 'me', (err) => {
        if (_.isFunction(callback)) {
          callback(err)
        } else {
          callback()
        }
      })
    }
  }
}

module.exports = GroupInitializer
