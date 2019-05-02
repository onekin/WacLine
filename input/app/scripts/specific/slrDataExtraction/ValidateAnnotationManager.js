const Events = require('../../contentScript/Events')
const Config = require('../../Config')
const CommonHypersheetManager = require('./CommonHypersheetManager')
const HyperSheetColors = require('./HyperSheetColors')
const swal = require('sweetalert2')
const _ = require('lodash')

class ValidateAnnotationManager {
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
    // Create event for annotation create
    this.events.annotationValidated = {element: document, event: Events.annotationValidated, handler: this.createAnnotationValidatedEventHandler()}
    this.events.annotationValidated.element.addEventListener(this.events.annotationValidated.event, this.events.annotationValidated.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createAnnotationValidatedEventHandler () {
    return (event) => {
      let annotation = event.detail.annotation
      console.debug('Validating annotation ' + annotation.id)
      let typeOfFacetData = this.typeOfFacet(annotation)
      if (_.isObject(typeOfFacetData)) {
        // Remove old validation annotations
        this.removeOldValidationAnnotations(typeOfFacetData, (err, result) => {
          if (err) {
            console.error(err)
            swal({
              type: 'error',
              title: 'Oops...',
              text: 'Unable to validate the classification. Unable to remove previously validate annotation.'
            })
          } else {
            // Create new validation annotation
            this.createNewValidationAnnotation(typeOfFacetData, (err, validateAnnotation) => {
              if (err) {
                console.error(err)
                swal({
                  type: 'error',
                  title: 'Oops...',
                  text: 'Unable to validate the classification. Unable to create validate annotation.'
                })
              } else {
                typeOfFacetData.validateAnnotation = validateAnnotation
                this.validateClassificationOnHypersheet(typeOfFacetData, (err, result) => {
                  if (err) {
                    // TODO Show user an error number
                    console.error(err)
                    swal({
                      type: 'error',
                      title: 'Oops...',
                      text: 'Unable to update hypersheet. Ensure you have permission to update it and try it again.'
                    })
                  } else {
                    console.debug('Validated annotation ' + annotation.id)
                    // Nothing to do, everything went okay
                    swal({ // TODO i18n
                      position: 'top-end',
                      type: 'success',
                      title: 'Correctly validated',
                      showConfirmButton: false,
                      timer: 1500
                    })
                  }
                })
              }
            })
          }
        })
      }
    }
  }

  validateClassificationOnHypersheet (typeOfFacetData, callback) {
    if (typeOfFacetData.typeOfFacet === 'monovalued') {
      // TODO Detect conflict
      // Update cell with current annotation link and green background
      CommonHypersheetManager.updateMonovaluedFacetInGSheet(
        typeOfFacetData.facet.name,
        typeOfFacetData.code.name,
        typeOfFacetData.annotation,
        HyperSheetColors.green,
        (err, result) => {
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
    } else if (typeOfFacetData.typeOfFacet === 'inductive') {
      CommonHypersheetManager.updateInductiveFacetInGSheet(
        typeOfFacetData.facet.name,
        typeOfFacetData.annotation,
        HyperSheetColors.green,
        (err, result) => {
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
    } else if (typeOfFacetData.typeOfFacet === 'multivalued') {
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
              return _.includes(tag, typeOfFacetData.facet.name)
            })
          }), (iterAnnotation) => { // Filter current annotation and validateAnnotation if is retrieved in allAnnotations
            return !_.isEqual(iterAnnotation.id, typeOfFacetData.annotation.id) || !_.isEqual(iterAnnotation.id, typeOfFacetData.validateAnnotation.id)
          })
          facetAnnotations.push(typeOfFacetData.annotation) // Add current annotation
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
          validationAnnotations.push(typeOfFacetData.validateAnnotation) // Add validate annotation
          facetAnnotations = _.concat(facetAnnotations, validationAnnotations)
          CommonHypersheetManager.updateClassificationMultivalued(
            facetAnnotations,
            typeOfFacetData.facet.name,
            (err, result) => {
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

  typeOfFacet (annotation) {
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
              return {
                annotation: annotation,
                typeOfFacet: 'multivalued',
                facet: facet,
                code: code
              }
            } else {
              return {
                annotation: annotation,
                typeOfFacet: 'monovalued',
                facet: facet,
                code: code
              }
            }
          } else {
            return null
          }
        } else {
          return null
        }
      } else {
        return null
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
          return {
            annotation: annotation,
            typeOfFacet: 'inductive',
            facet: facet
          }
        } else {
          return null
        }
      } else {
        return null
      }
    }
  }

  removeOldValidationAnnotations (typeOfFacetData, callback) {
    if (typeOfFacetData.typeOfFacet === 'monovalued' || typeOfFacetData.typeOfFacet === 'inductive') {
      window.abwa.hypothesisClientManager.hypothesisClient.searchAnnotations({
        url: window.abwa.contentTypeManager.getDocumentURIToSearchInHypothesis(),
        uri: window.abwa.contentTypeManager.getDocumentURIToSaveInHypothesis(),
        group: window.abwa.groupSelector.currentGroup.id,
        user: window.abwa.groupSelector.user.userid,
        order: 'asc',
        tag: this.tags.validated
      }, (err, annotations) => {
        if (err) {
          if (_.isFunction(callback)) {
            callback(err)
          }
        } else {
          // Remove all annotations
          let promises = []
          for (let i = 0; i < annotations.length; i++) {
            let annotationId = annotations[i].id
            promises.push(new Promise((resolve, reject) => {
              window.abwa.hypothesisClientManager.hypothesisClient.deleteAnnotation(annotationId, (err, result) => {
                if (err) {
                  reject(err)
                } else {
                  resolve(result)
                }
              })
            }))
          }
          Promise.all(promises).catch(() => {
            if (_.isFunction(callback)) {
              callback(new Error('Error while deleting previous validations from Hypothes.is'))
            }
          }).then(() => {
            if (_.isFunction(callback)) {
              callback(null)
            }
          })
        }
      })
    } else if (typeOfFacetData.typeOfFacet === 'multivalued') {
      // Remove old validations for current facet + code
      CommonHypersheetManager.getAllAnnotations((err, allAnnotations) => {
        if (err) {
          if (_.isFunction(callback)) {
            callback(err)
          }
        } else {
          console.log(typeOfFacetData)
          let facetCodeAnnotations = _.filter(allAnnotations, (annotation) => {
            return _.find(annotation.tags, (tag) => {
              return tag === 'slr:isCodeOf:' + typeOfFacetData.facet.name
            }) && _.find(annotation.tags, (tag) => {
              return tag === 'slr:code:' + typeOfFacetData.code.name
            })
          })
          // Retrieve validation annotations for current facet and user
          let validationAnnotations = _.filter(allAnnotations, (annotation) => {
            return _.find(annotation.tags, (tag) => {
              return _.includes(tag, this.tags.validated)
            }) && _.every(annotation.references, (reference) => {
              return _.find(facetCodeAnnotations, (facetCodeAnnotation) => {
                return facetCodeAnnotation.id === reference
              })
            }) && annotation.user === window.abwa.groupSelector.user.userid
          })
          // Remove all validate annotations which has same facet and code
          let promises = []
          for (let i = 0; i < validationAnnotations.length; i++) {
            let annotationId = validationAnnotations[i].id
            promises.push(new Promise((resolve, reject) => {
              window.abwa.hypothesisClientManager.hypothesisClient.deleteAnnotation(annotationId, (err, result) => {
                if (err) {
                  reject(err)
                } else {
                  resolve(result)
                }
              })
            }))
          }
          Promise.all(promises).catch(() => {
            if (_.isFunction(callback)) {
              callback(new Error('Error while deleting previous validations from Hypothes.is'))
            }
          }).then(() => {
            if (_.isFunction(callback)) {
              callback(null)
            }
          })
        }
      })
    }
  }

  createNewValidationAnnotation (typeOfFacetData, callback) {
    window.abwa.hypothesisClientManager.hypothesisClient.createNewAnnotation(this.constructValidatedAnnotation(typeOfFacetData.annotation.id), (err, annotation) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        if (_.isFunction(callback)) {
          callback(null, annotation)
        }
      }
    })
  }

  constructValidatedAnnotation (referenceAnnotationId) {
    return {
      group: window.abwa.groupSelector.currentGroup.id,
      permissions: {
        read: ['group:' + window.abwa.groupSelector.currentGroup.id]
      },
      references: [referenceAnnotationId],
      tags: [this.tags.validated],
      target: [],
      text: '',
      uri: window.abwa.contentTypeManager.getDocumentURIToSaveInHypothesis()
    }
  }
}

module.exports = ValidateAnnotationManager
