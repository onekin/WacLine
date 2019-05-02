const _ = require('lodash')
const swal = require('sweetalert2')
const ChromeStorage = require('../utils/ChromeStorage')
const Config = require('../Config')

const selectedGroupNamespace = 'hypothesis.currentGroup'

class HypothesisGroupInitializer {
  init (mappingStudy, callback) {
    this.mappingStudy = mappingStudy
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
    window.hag.hypothesisClientManager.hypothesisClient.getUserProfile((err, userProfile) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        this.userProfile = userProfile
        let group = _.find(userProfile.groups, (group) => {
          return group.name === this.mappingStudy.name.substr(0, 25)
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
                  this.createRelationGSheetGroup((err) => {
                    if (err) {
                      swal('Oops!', // TODO i18n
                        'There was a problem while relating the tool with the spreadsheet. Please reload the page and try it again. <br/>' +
                        'If error continues, please contact administrator.',
                        'error') // Show to the user the error
                      // Remove created hypothesis group
                      this.removeGroup()
                      if (_.isFunction(callback)) {
                        callback(err)
                      }
                    } else {
                      // Save as current group the generated one
                      ChromeStorage.setData(selectedGroupNamespace, {data: JSON.stringify(this.mappingStudy.hypothesisGroup)}, ChromeStorage.local)
                      // When window.focus
                      swal('Correctly configured', // TODO i18n
                        chrome.i18n.getMessage('ShareHypothesisGroup') + '<br/><a href="' + this.mappingStudy.hypothesisGroup.url + '" target="_blank">' + this.mappingStudy.hypothesisGroup.url + '</a>',
                        'success')
                      if (_.isFunction(callback)) {
                        callback()
                      }
                    }
                  })
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
    window.hag.hypothesisClientManager.hypothesisClient.createHypothesisGroup(this.mappingStudy.name, (err, group) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        console.debug('Created group in hypothesis: ')
        console.debug(group)
        this.mappingStudy.hypothesisGroup = group
        if (_.isFunction(callback)) {
          callback()
        }
      }
    })
  }

  createFacetsAndCodes (callback) {
    console.log(this.mappingStudy.facets)
    let annotations = []
    let facets = this.mappingStudy.facets
    for (let i = 0; i < facets.length; i++) {
      let facet = facets[i]
      // Create annotation for facet
      annotations.push(this.generateFacetAnnotationCorpus(facet))
      // Create annotations for codes
      let codes = facet.codes
      for (let j = 0; j < facet.codes.length; j++) {
        let code = codes[j]
        annotations.push(this.generateCodeAnnotationCorpus(code))
      }
    }
    console.debug('Generated dimensions and categories annotations: ')
    console.debug(annotations)
    window.hag.hypothesisClientManager.hypothesisClient.createNewAnnotations(annotations, (err, result) => {
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

  generateFacetAnnotationCorpus (facet) {
    let tags = [Config.slrDataExtraction.namespace + ':' + Config.slrDataExtraction.tags.grouped.group + ':' + facet.name]
    if (facet.multivalued) {
      tags.push(Config.slrDataExtraction.namespace + ':' + Config.slrDataExtraction.tags.statics.multivalued)
    }
    if (facet.inductive) {
      tags.push(Config.slrDataExtraction.namespace + ':' + Config.slrDataExtraction.tags.statics.inductive)
    }
    return this.generateAnnotationCorpus(tags)
  }

  generateCodeAnnotationCorpus (code) {
    let codeTag = Config.slrDataExtraction.namespace + ':' + Config.slrDataExtraction.tags.grouped.subgroup + ':' + code.name
    let isCodeOfTag = Config.slrDataExtraction.namespace + ':' + Config.slrDataExtraction.tags.grouped.relation + ':' + code.facet
    let tags = [codeTag, isCodeOfTag]
    return this.generateAnnotationCorpus(tags)
  }

  createRelationGSheetGroup (callback) {
    // Create relation to sheet annotation
    let relationAnnotation = this.generateRelateSheetAndGroupAnnotation()
    window.hag.hypothesisClientManager.hypothesisClient.createNewAnnotation(relationAnnotation, (err, annotation) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        console.debug('Created relation between sheet and hypothesis group: ')
        console.debug(annotation)
        if (_.isFunction(callback)) {
          callback()
        }
      }
    })
  }

  generateAnnotationCorpus (tags) {
    return {
      group: this.mappingStudy.hypothesisGroup.id,
      permissions: {
        read: ['group:' + this.mappingStudy.hypothesisGroup.id]
      },
      references: [],
      tags: tags,
      target: [],
      text: '',
      uri: this.mappingStudy.hypothesisGroup.url // Group url
    }
  }

  generateRelateSheetAndGroupAnnotation () {
    return {
      group: this.mappingStudy.hypothesisGroup.id,
      permissions: {
        read: ['group:' + this.mappingStudy.hypothesisGroup.id]
      },
      references: [],
      tags: [Config.slrDataExtraction.namespace + ':' + Config.slrDataExtraction.tags.statics.spreadsheet],
      target: [],
      text: 'spreadsheetId: ' + this.mappingStudy.spreadsheetId + '\n' + 'sheetId: ' + this.mappingStudy.sheetId,
      uri: this.mappingStudy.hypothesisGroup.url // Group url
    }
  }

  removeGroup (callback) {
    if (this.mappingStudy.hypothesisGroup) {
      window.hag.hypothesisClientManager.hypothesisClient.removeAMemberFromAGroup(this.mappingStudy.hypothesisGroup.id, 'me', (err) => {
        if (_.isFunction(callback)) {
          callback(err)
        } else {
          callback()
        }
      })
    }
  }

  updateHypothesisGroup () {

  }
}

module.exports = HypothesisGroupInitializer
