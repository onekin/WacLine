import _ from 'lodash'
import Alerts from '../../../../utils/Alerts'
import ChromeStorage from '../../../../utils/ChromeStorage'
import Codebook from '../../../model/Codebook'
// PVSCL:IFCOND(ApplicationBased, LINE)
import Config from '../../../../Config'
// PVSCL:ENDCOND
const selectedGroupNamespace = 'hypothesis.currentGroup'

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
    window.googleSheetProvider.annotationServerManager.client.getListOfGroups({}, (err, groups) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        const group = _.find(groups, (group) => {
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
              Alerts.errorAlert({
                title: 'Oops!',
                text: 'There was a problem while creating the group. Please reload the page and try it again. <br/>' +
                  'If the error continues, please contact administrator.'
              })
              if (_.isFunction(callback)) {
                callback(err)
              }
            } else {
              this.createFacetsAndCodes((err) => {
                if (err) {
                  Alerts.errorAlert({
                    title: 'Oops!',
                    text: 'There was a problem while creating buttons for the sidebar. Please reload the page and try it again. <br/>' +
                      'If the error continues, please contact administrator.'
                  })
                  // Remove created hypothesis group
                  this.removeGroup()
                  if (_.isFunction(callback)) {
                    callback(err)
                  }
                } else {
                  // Save as current group the generated one
                  ChromeStorage.setData(selectedGroupNamespace, { data: JSON.stringify(this.annotationGuide.annotationServer.group) }, ChromeStorage.local)
                  // Get group url
                  const selectedAnnotationServerManager = window.googleSheetProvider.annotationServerManager
                  const groupUrl = selectedAnnotationServerManager.constructSearchUrl({ group: this.annotationGuide.annotationServer.getGroupId() })
                  Alerts.successAlert({
                    title: 'Correctly configured', // TODO i18n
                    text: chrome.i18n.getMessage('VisitTheCreatedGroup') + ' <a href="' + groupUrl + '" target="_blank">here</a>.'
                  })
                  if (_.isFunction(callback)) {
                    callback()
                  }
                }
              })
            }
          })
        } else {
          const selectedAnnotationServerManager = window.googleSheetProvider.annotationServerManager
          const groupUrl = selectedAnnotationServerManager.constructSearchUrl({ group: group.id })
          Alerts.infoAlert({
            title: 'The group ' + group.name + ' already exists', // TODO i18n
            text: chrome.i18n.getMessage('VisitTheCreatedGroup') + ' <a href="' + groupUrl + '" target="_blank">here</a>.',
          })
          if (_.isFunction(callback)) {
            callback()
          }
          // TODO Update Hypothesis group
        }
      }
    })
  }

  createGroup (callback) {
    window.googleSheetProvider.annotationServerManager.client.createNewGroup({ name: this.annotationGuide.name }, (err, group) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        console.debug('Created group in hypothesis: ')
        console.debug(group)
        Codebook.setAnnotationServer(group, (annotationServer) => {
          this.annotationGuide.annotationServer = annotationServer
          if (_.isFunction(callback)) {
            callback()
          }
        })
      }
    })
  }

  createFacetsAndCodes (callback) {
    const annotations = this.annotationGuide.toAnnotations()
    console.debug('Generated dimensions and categories annotations: ')
    console.debug(annotations)
    window.googleSheetProvider.annotationServerManager.client.createNewAnnotations(annotations, (err) => {
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
    if (this.annotationGuide.annotationServer) {
      window.googleSheetProvider.annotationServerManager.client.removeAMemberFromAGroup(this.annotationGuide.annotationServer.getGroupId(), 'me', (err) => {
        if (_.isFunction(callback)) {
          callback(err)
        } else {
          callback()
        }
      })
    }
  }
}

export default GroupInitializer
