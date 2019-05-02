const Events = require('../../contentScript/Events')
const Config = require('../../Config')
const CommonHypersheetManager = require('./CommonHypersheetManager')
const swal = require('sweetalert2')
const _ = require('lodash')

class DeleteAnnotationManager {
  constructor () {
    this.events = {}
    this.tags = {
      isCodeOf: Config.slrDataExtraction.namespace + ':' + Config.slrDataExtraction.tags.grouped.relation + ':',
      facet: Config.slrDataExtraction.namespace + ':' + Config.slrDataExtraction.tags.grouped.group + ':',
      code: Config.slrDataExtraction.namespace + ':' + Config.slrDataExtraction.tags.grouped.subgroup + ':',
      validated: Config.slrDataExtraction.namespace + ':' + Config.slrDataExtraction.tags.statics.validated
    }
  }

  init (callback) {
    // Create event for annotation delete
    this.events.annotationDeleted = {element: document, event: Events.annotationDeleted, handler: this.createAnnotationDeletedEventHandler()}
    this.events.annotationDeleted.element.addEventListener(this.events.annotationDeleted.event, this.events.annotationDeleted.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createAnnotationDeletedEventHandler () {
    return (event) => {
      this.deleteClassificationFromHypersheet(event.detail.annotation, (err) => {
        if (err) {
          // TODO Show user an error number
          console.error(err)
          swal({
            type: 'error',
            title: 'Oops...',
            text: 'Unable to update hypersheet. Ensure you have permission to update it and try it again.'
          })
        } else {
          // Nothing to do
          console.debug('Correctly updated google sheet with created annotation')
        }
      })
    }
  }

  destroy (callback) {
    // Remove the event listeners
    let events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
    if (_.isFunction(callback)) {
      callback()
    }
  }

  deleteClassificationFromHypersheet (annotation, callback) {
    // Retrieve annotation facet (non-inductive)
    let facetTag = _.find(annotation.tags, (tag) => {
      return tag.includes(this.tags.isCodeOf)
    })
    if (facetTag) { // Non-inductive annotation
      let facetName = facetTag.replace(this.tags.isCodeOf, '')
      // Retrieve current facet
      let facet = _.find(window.abwa.specific.mappingStudyManager.mappingStudy.facets, (facet) => { return facet.name === facetName })
      if (!_.isEmpty(facet)) {
        let codeTag = _.find(annotation.tags, (tag) => {
          return tag.includes(this.tags.code)
        })
        if (_.isString(codeTag)) {
          let codeName = codeTag.replace(this.tags.code, '')
          // Retrieve current code
          let code = _.find(facet.codes, (code) => { return code.name === codeName })
          if (!_.isEmpty(code)) {
            // Multivalues and monovalues are treated in different ways
            if (facet.multivalued) {
              this.deleteClassificationFromHypersheetMultivalued(code, annotation, (err) => {
                if (err) {
                  callback(err)
                } else {
                  callback(null)
                }
              })
            } else {
              this.deleteClassificationFromHypersheetMonovalued(code, annotation, (err) => {
                if (err) {
                  callback(err)
                } else {
                  callback(null)
                }
              })
            }
          } else {
            callback(new Error('No code found for current annotation'))
          }
        } else {
          callback(new Error('No code tag found in annotation'))
        }
      } else {
        callback(new Error('No facet found for current annotation'))
      }
    } else {
      // Retrieve annotation facet (inductive)
      facetTag = _.find(annotation.tags, (tag) => {
        return tag.includes(this.tags.facet)
      })
      if (_.isString(facetTag)) {
        let facetName = facetTag.replace(this.tags.facet, '')
        let facet = _.find(window.abwa.specific.mappingStudyManager.mappingStudy.facets, (facet) => { return facet.name === facetName })
        if (facet) {
          this.deleteClassificationFromHypersheetInductive(facet, annotation, (err) => {
            if (err) {
              callback(err)
            } else {
              callback(null)
            }
          })
        } else {
          callback(new Error('No facet found for current annotation'))
        }
      } else {
        callback(new Error('Annotation is not for mapping study'))
      }
    }
  }

  deleteClassificationFromHypersheetMonovalued (code, deletedAnnotation, callback) {
    CommonHypersheetManager.getAllAnnotations((err, allAnnotations) => {
      if (err) {
        // Error while updating hypersheet
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        // Retrieve annotations with same facet
        let facetAnnotations = _.filter(_.filter(allAnnotations, (annotation) => {
          return _.find(annotation.tags, (tag) => {
            return _.includes(tag, code.facet)
          })
        }), (iterAnnotation) => { // Filter current annotation if is retrieved in allAnnotations
          return !_.isEqual(iterAnnotation.id, deletedAnnotation.id)
        })
        // Retrieve validation annotations for current facet
        let validationAnnotations = _.filter(allAnnotations, (annotation) => {
          return _.find(annotation.tags, (tag) => {
            return _.includes(tag, this.tags.validated)
          }) && _.every(annotation.references, (reference) => {
            return _.find(facetAnnotations, (facetAnnotation) => {
              return facetAnnotation.id === reference
            })
          })
        })
        facetAnnotations = _.concat(facetAnnotations, validationAnnotations)
        // Update classification with current annotations for this facet
        CommonHypersheetManager.updateClassificationMonovalued(facetAnnotations, code.facet, (err, result) => {
          if (err) {
            if (_.isFunction(callback)) {
              callback(err)
            }
          } else {
            if (_.isFunction(callback)) {
              callback(null, result)
            }
          }
        })
      }
    })
  }

  deleteClassificationFromHypersheetInductive (facet, deletedAnnotation, callback) {
    CommonHypersheetManager.getAllAnnotations((err, allAnnotations) => {
      if (err) {
        // Error while updating hypersheet
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        // Retrieve annotations with same facet
        let facetAnnotations = _.filter(_.filter(allAnnotations, (annotation) => {
          return _.find(annotation.tags, (tag) => {
            return _.includes(tag, facet.name)
          })
        }), (iterAnnotation) => { // Filter current annotation if is retrieved in allAnnotations
          return !_.isEqual(iterAnnotation.id, deletedAnnotation.id)
        })
        // Retrieve validation annotations for current facet
        let validationAnnotations = _.filter(allAnnotations, (annotation) => {
          return _.find(annotation.tags, (tag) => {
            return _.includes(tag, this.tags.validated)
          }) && _.every(annotation.references, (reference) => {
            return _.find(facetAnnotations, (facetAnnotation) => {
              return facetAnnotation.id === reference
            })
          })
        })
        facetAnnotations = _.concat(facetAnnotations, validationAnnotations)
        CommonHypersheetManager.updateClassificationInductive(facetAnnotations, facet, (err) => {
          if (err) {
            if (_.isFunction(callback)) {
              callback(err)
            }
          } else {
            if (_.isFunction(callback)) {
              callback(null)
            }
          }
        })
      }
    })
  }

  deleteClassificationFromHypersheetMultivalued (code, deletedAnnotation, callback) {
    CommonHypersheetManager.getAllAnnotations((err, allAnnotations) => {
      if (err) {
        // Error while updating hypersheet, TODO notify user
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        // Retrieve annotations with same facet
        let facetAnnotations = _.filter(_.filter(allAnnotations, (annotation) => {
          return _.find(annotation.tags, (tag) => {
            return _.includes(tag, code.facet)
          })
        }), (iterAnnotation) => { // Filter current annotation if is retrieved in allAnnotations
          return !_.isEqual(iterAnnotation.id, deletedAnnotation.id)
        })
        // Retrieve validation annotations for current facet
        let validationAnnotations = _.filter(allAnnotations, (annotation) => {
          return _.find(annotation.tags, (tag) => {
            return _.includes(tag, this.tags.validated)
          }) && _.every(annotation.references, (reference) => {
            return _.find(facetAnnotations, (facetAnnotation) => {
              return facetAnnotation.id === reference
            })
          })
        })
        facetAnnotations = _.concat(facetAnnotations, validationAnnotations)
        CommonHypersheetManager.updateClassificationMultivalued(facetAnnotations, code.facet, (err) => {
          if (err) {
            if (_.isFunction(callback)) {
              callback(err)
            }
          } else {
            if (_.isFunction(callback)) {
              callback(null)
            }
          }
        })
      }
    })
  }
}

module.exports = DeleteAnnotationManager
