const Alerts = require('../../utils/Alerts')
const Events = require('../../contentScript/Events')
const Criteria = require('../../model/schema/Criteria')
const Level = require('../../model/schema/Level')
const Review = require('../../model/schema/Review')
const DefaultCriterias = require('./DefaultCriterias')
const _ = require('lodash')
const $ = require('jquery')
require('jquery-contextmenu/dist/jquery.contextMenu')
const Config = require('../../Config')
const AnnotationUtils = require('../../utils/AnnotationUtils')

class CustomCriteriasManager {
  constructor () {
    this.events = {}
  }

  init (callback) {
    this.createAddCustomCriteriaButton(() => {
      // Initialize event handlers
      this.initEventHandler()
      // Init context menu for buttons
      this.initContextMenu()
    })
  }

  initEventHandler () {
    this.events.tagsUpdated = {
      element: document,
      event: Events.tagsUpdated,
      handler: (event) => {
        this.createAddCustomCriteriaButton()
        this.initContextMenu()
      }
    }
    this.events.tagsUpdated.element.addEventListener(this.events.tagsUpdated.event, this.events.tagsUpdated.handler, false)
  }

  createAddCustomCriteriaButton (callback) {
    // Get Other container
    let otherGroupContainer = document.querySelector('.groupName[title="Other"]').parentElement.querySelector('.tagButtonContainer')

    // Add separator between other criterias and creator
    let separator = document.createElement('hr')
    separator.className = 'separator'
    otherGroupContainer.prepend(separator)

    // Create button for new element
    let addCriteriaButton = document.createElement('button')
    addCriteriaButton.innerHTML = '<img class="buttonIcon" src="' + chrome.extension.getURL('/images/add.png') + '"/> new criteria'
    addCriteriaButton.className = 'customCriteriaButton'
    addCriteriaButton.addEventListener('click', this.createAddCustomCriteriaButtonHandler())

    // Prepend create new criteria button
    otherGroupContainer.prepend(addCriteriaButton)

    if (_.isFunction(callback)) {
      callback()
    }
  }

  createAddCustomCriteriaButtonHandler () {
    return (event) => {
      let isSidebarOpened = window.abwa.sidebar.isOpened()
      window.abwa.sidebar.closeSidebar()
      Alerts.inputTextAlert({
        input: 'text',
        inputPlaceholder: 'Insert the name for the new criteria...',
        callback: (err, name) => {
          if (err) {
            Alerts.errorAlert({text: 'Unable to create this custom criteria, try it again.'})
          } else {
            // TODO Check if there is not other criteria with the same value
            this.createNewCustomCriteria({
              name: name,
              callback: () => {
                // Open sidebar again
                if (isSidebarOpened) {
                  window.abwa.sidebar.openSidebar()
                }
              }
            })
          }
        }
      })
    }
  }

  createNewCustomCriteria ({name, description = 'Custom criteria', callback}) {
    let review = new Review({reviewId: ''})
    review.hypothesisGroup = window.abwa.groupSelector.currentGroup
    let criteria = new Criteria({name, description, review, custom: true})
    // Create levels for the criteria
    let levels = DefaultCriterias.defaultLevels
    criteria.levels = []
    for (let j = 0; j < levels.length; j++) {
      let level = new Level({name: levels[j].name, criteria: criteria})
      criteria.levels.push(level)
    }
    let annotations = criteria.toAnnotations()
    // Push annotations to hypothes.is
    window.abwa.hypothesisClientManager.hypothesisClient.createNewAnnotations(annotations, (err, annotations) => {
      if (err) {
        Alerts.errorAlert({title: 'Unable to create a custom category', text: 'Error when trying to create a new custom category. Please try again.'})
        callback(err)
      } else {
        // Reload sidebar
        window.abwa.tagManager.reloadTags(() => {
          if (_.isFunction(callback)) {
            callback()
          }
        })
      }
    })
  }

  destroy () {
    // Remove event listeners
    let events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }

  deleteTag (tagGroup) {
    // Get tags used in hypothes.is to store this tag or annotations with this tag
    let annotationsToDelete = []
    // Get annotation of the tag group
    annotationsToDelete.push(tagGroup.config.annotation.id)
    window.abwa.hypothesisClientManager.hypothesisClient.searchAnnotations({
      tags: Config.review.namespace + ':' + Config.review.tags.grouped.relation + ':' + tagGroup.config.name
    }, (err, annotations) => {
      if (err) {
        // TODO Send message unable to delete
      } else {
        annotationsToDelete = annotationsToDelete.concat(_.map(annotations, 'id'))
        // Delete all the annotations
        let promises = []
        for (let i = 0; i < annotationsToDelete.length; i++) {
          promises.push(new Promise((resolve, reject) => {
            window.abwa.hypothesisClientManager.hypothesisClient.deleteAnnotation(annotationsToDelete[i], (err) => {
              if (err) {
                reject(new Error('Unable to delete annotation id: ' + annotationsToDelete[i]))
              } else {
                resolve()
              }
            })
            return true
          }))
        }
        // When all the annotations are deleted
        Promise.all(promises).catch(() => {
          Alerts.errorAlert({text: 'There was an error when trying to delete all the annotations for this tag, please reload and try it again.'})
        }).then(() => {
          // Update tag manager and then update all annotations
          setTimeout(() => {
            window.abwa.tagManager.reloadTags(() => {
              window.abwa.contentAnnotator.updateAllAnnotations(() => {
                window.abwa.sidebar.openSidebar()
              })
            })
          }, 1000)
        })
      }
    })
  }

  initContextMenu () {
    // Define context menu items
    let arrayOfTagGroups = _.values(window.abwa.tagManager.model.currentTags)
    for (let i = 0; i < arrayOfTagGroups.length; i++) {
      let tagGroup = arrayOfTagGroups[i]
      let items = {}
      // Modify menu element
      items['modify'] = { name: 'Modify criteria' }
      // If custom criteria, it is also possible to delete it
      if (tagGroup.config.options.custom) {
        items['delete'] = { name: 'Delete criteria' }
      }
      $.contextMenu({
        selector: '[data-mark="' + tagGroup.config.name + '"]',
        build: () => {
          return {
            callback: (key, opt) => {
              if (key === 'delete') {
                this.deleteCriteriaHandler(tagGroup)
              } else if (key === 'modify') {
                this.modifyCriteriaHandler(tagGroup)
              }
            },
            items: items
          }
        }
      })
    }
  }

  deleteCriteriaHandler (tagGroup) {
    // Ask user if they are sure to delete the current tag
    Alerts.confirmAlert({
      alertType: Alerts.alertType.question,
      title: chrome.i18n.getMessage('DeleteCriteriaConfirmationTitle'),
      text: chrome.i18n.getMessage('DeleteCriteriaConfirmationMessage'),
      callback: (err, toDelete) => {
        // It is run only when the user confirms the dialog, so delete all the annotations
        if (err) {
          // Nothing to do
        } else {
          this.deleteTag(tagGroup)
        }
      }
    })
  }

  modifyCriteriaHandler (tagGroup, defaultNameValue = null, defaultDescriptionValue = null) {
    let criteriaName
    let criteriaDescription
    let formCriteriaNameValue = defaultNameValue || tagGroup.config.name
    let formCriteriaDescriptionValue = defaultDescriptionValue || tagGroup.config.options.description
    Alerts.multipleInputAlert({
      title: 'Modifying criteria name and description',
      html: '<div>' +
        '<input id="criteriaName" class="swal2-input customizeInput" value="' + formCriteriaNameValue + '"/>' +
        '</div>' +
        '<div>' +
        '<textarea id="criteriaDescription" class="swal2-input customizeInput" placeholder="Description">' + formCriteriaDescriptionValue + '</textarea>' +
        '</div>',
      preConfirm: () => {
        // Retrieve values from inputs
        criteriaName = document.getElementById('criteriaName').value
        criteriaDescription = document.getElementById('criteriaDescription').value
      },
      callback: () => {
        // Revise to execute only when OK button is pressed or criteria name and descriptions are not undefined
        if (!_.isUndefined(criteriaName) && !_.isUndefined(criteriaDescription)) {
          this.modifyCriteria({
            tagGroup: tagGroup, name: criteriaName, description: criteriaDescription
          })
        }
      }
    })
  }

  modifyCriteria ({tagGroup, name, description, callback}) {
    // Check if name has changed
    if (name === tagGroup.config.name) {
      // Check if description has changed
      if (description !== tagGroup.config.options.description) {
        // Update annotation description
        let oldAnnotation = tagGroup.config.annotation
        tagGroup.config.options.description = description
        // Create new annotation
        let review = new Review({reviewId: ''})
        review.hypothesisGroup = window.abwa.groupSelector.currentGroup
        let criteria = new Criteria({name, description, group: tagGroup.config.options.group, review, custom: true})
        let annotation = criteria.toAnnotation()
        window.abwa.hypothesisClientManager.hypothesisClient.updateAnnotation(oldAnnotation.id, annotation, (err, annotation) => {
          if (err) {
            // TODO Show err
          } else {
            // Update tag manager and then update all annotations
            setTimeout(() => {
              window.abwa.tagManager.reloadTags(() => {
                window.abwa.contentAnnotator.updateAllAnnotations(() => {
                  window.abwa.sidebar.openSidebar()
                })
              })
            }, 1000)
          }
        })
      }
    } else {
      // If name has changed, check if there is not other criteria with the same value
      if (this.alreadyExistsThisCriteriaName(name)) {
        // Alert already exists
        Alerts.errorAlert({
          title: 'Criteria already exists',
          text: 'A criteria with the name ' + name + ' already exists.',
          callback: () => {
            this.modifyCriteriaHandler(tagGroup, name, description)
          }
        })
      } else {
        // Update all annotations review:isCriteriaOf:
        window.abwa.hypothesisClientManager.hypothesisClient.searchAnnotations({
          tags: Config.review.namespace + ':' + Config.review.tags.grouped.relation + ':' + tagGroup.config.name
        }, (err, annotationsToUpdateTag) => {
          if (err) {
            // Unable to update
            Alerts.errorAlert({text: 'Unable to update criteria.'})
          } else {
            let oldTag = Config.review.namespace + ':' + Config.review.tags.grouped.relation + ':' + tagGroup.config.name
            let newTag = Config.review.namespace + ':' + Config.review.tags.grouped.relation + ':' + name
            // Update annotations tag
            annotationsToUpdateTag = _.map(annotationsToUpdateTag, (annotation) => {
              // Change isCriteriOf tag with the new one
              return AnnotationUtils.modifyTag(annotation, oldTag, newTag)
            })
            // Update all annotations
            let promises = []
            for (let i = 0; i < annotationsToUpdateTag.length; i++) {
              promises.push(new Promise((resolve, reject) => {
                window.abwa.hypothesisClientManager.hypothesisClient.updateAnnotation(annotationsToUpdateTag[i].id, annotationsToUpdateTag[i], (err, annotation) => {
                  if (err) {
                    reject(err)
                  } else {
                    resolve(annotation)
                  }
                })
              }))
            }
            Promise.all(promises).catch(() => {
              // TODO Some annotations where unable to update
            }).then(() => {
              // Update tagGroup annotation
              let review = new Review({reviewId: ''})
              review.hypothesisGroup = window.abwa.groupSelector.currentGroup
              let criteria = new Criteria({name, description, group: tagGroup.config.options.group, review})
              let annotation = criteria.toAnnotation()
              let oldAnnotation = tagGroup.config.annotation
              window.abwa.hypothesisClientManager.hypothesisClient.updateAnnotation(oldAnnotation.id, annotation, () => {
                if (err) {

                } else {
                  // Update tag manager and then update all annotations
                  setTimeout(() => {
                    window.abwa.tagManager.reloadTags(() => {
                      window.abwa.contentAnnotator.updateAllAnnotations(() => {
                        window.abwa.sidebar.openSidebar()
                      })
                    })
                  }, 1000)
                }
              })
            })
          }
        })
      }
    }
  }

  /**
   * Returns true if this criteria already exists, otherwise false
   * @param name
   * @return {boolean}
   */
  alreadyExistsThisCriteriaName (name) {
    return !!_.find(window.abwa.tagManager.currentTags, (tag) => { return tag.config.name === name })
  }
}

module.exports = CustomCriteriasManager
