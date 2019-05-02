const HyperSheetColors = require('./HyperSheetColors')
const _ = require('lodash')
const Config = require('../../Config')
const TagManager = require('../../contentScript/TagManager')

class CommonHypersheetManager {
  static updateClassificationMultivalued (facetAnnotations, facetName, callback) {
    let requests = [] // Requests to send to google sheets api
    // List all users who annotate the facet
    let uniqueUsers = _.uniq(_.map(facetAnnotations, (facetAnnotation) => { return facetAnnotation.user }))
    // List all codes used
    let uniqCodeTags = _.uniq(_.map(facetAnnotations, (facetAnnotation) => {
      return _.find(facetAnnotation.tags, (tag) => {
        return tag.includes(CommonHypersheetManager.tags.code)
      })
    }))
    // Remove if any undefined is found (with slr:validated is created an undefined element)
    uniqCodeTags = _.reject(uniqCodeTags, (tag) => { return _.isUndefined(tag) })
    let cells = []
    for (let i = 0; i < uniqCodeTags.length; i++) {
      let uniqCodeTag = uniqCodeTags[i]
      let cell = {
        code: uniqCodeTag.replace(CommonHypersheetManager.tags.code, '')
      }
      // Check if any of the annotations for this code is referenced by validate annotation and validate annotation is newer than all of them
      let newestAnnotationResult = this.isValidatedAnnotationNewest(facetAnnotations, uniqCodeTag)
      if (_.isObject(newestAnnotationResult)) {
        console.debug('Code %s from multivalued facet %s is validated', uniqCodeTag, facetName)
        cell.color = HyperSheetColors.green
        // Retrieve referenced annotation
        let referencedAnnotation = _.find(facetAnnotations, (facetAnnotation) => {
          return _.find(newestAnnotationResult.references, (reference) => {
            return reference === facetAnnotation.id
          })
        })
        cell.annotation = referencedAnnotation
      } else {
        // If more than one user has classified this primary study
        if (uniqueUsers.length > 1) {
          // Check if all users have used this code
          if (CommonHypersheetManager.allUsersHaveCode(facetAnnotations, uniqueUsers, uniqCodeTag)) {
            cell.color = HyperSheetColors.yellow // All users used code
          } else {
            cell.color = HyperSheetColors.red // Non all users used code
          }
        } else {
          cell.color = HyperSheetColors.white
        }
        // Get oldest annotation for code
        cell.annotation = _.find(facetAnnotations, (annotation) => {
          return _.find(annotation.tags, (tag) => {
            return tag === uniqCodeTag
          })
        })
      }
      cells.push(cell)
    }
    // Order cells by name
    cells = _.sortBy(cells, 'code')
    // Check if sufficient columns to add all codes to spreadsheet
    window.abwa.specific.primaryStudySheetManager.getGSheetData((err, sheetData) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        // Retrieve start and end columns for facet
        let headersRow = sheetData.data[0].rowData[0].values
        let startIndex = _.findIndex(headersRow, (cell) => { return cell.formattedValue === facetName })
        let lastIndex = _.findLastIndex(headersRow, (cell) => { return cell.formattedValue === facetName })
        if (startIndex === -1 || lastIndex === -1) {
          callback(new Error('Unable to find column for current facet'))
        } else {
          if (startIndex === lastIndex) {
            callback(new Error('Facet was multivalued, but nowadays only has a column. Please duplicate the column for this facet.'))
          } else {
            let columnsForFacet = lastIndex - startIndex + 1
            if (columnsForFacet >= cells.length) {
              // Sufficient columns for all data
            } else {
              // Need to create new column to insert all the facets
              let appendColumnRequest = window.abwa.specific.primaryStudySheetManager.googleSheetClientManager.googleSheetClient.createRequestInsertEmptyColumn({
                sheetId: window.abwa.specific.mappingStudyManager.mappingStudy.sheetId,
                startIndex: lastIndex + 1,
                numberOfColumns: cells.length - columnsForFacet
              })
              requests.push(appendColumnRequest)
              // Need to add header to the new columns
              let newColumnsHeaderRequest = window.abwa.specific.primaryStudySheetManager.googleSheetClientManager.googleSheetClient.createRequestCopyCell({
                sourceRow: 0,
                sourceColumn: startIndex,
                destinationRow: 0,
                destinationColumn: lastIndex,
                destinationNumberOfColumns: cells.length - columnsForFacet + 1,
                sheetId: window.abwa.specific.mappingStudyManager.mappingStudy.sheetId
              })
              requests.push(newColumnsHeaderRequest)
            }
            // Create cells for values to be inserted
            CommonHypersheetManager.createGSheetCellsFromCodeCells(cells, (err, gSheetCells) => {
              if (err) {
                if (_.isFunction(callback)) {
                  callback(err)
                }
              } else {
                // Retrieve last column number (if new columns are created, calculate, else lastIndex + 1
                let lastColumnIndex = (cells.length - columnsForFacet + 1) > 0 ? lastIndex + cells.length - columnsForFacet + 1 : lastIndex + 1
                // Create request to insert the values to spreadsheet
                let updateCellsRequest = window.abwa.specific.primaryStudySheetManager.googleSheetClientManager.googleSheetClient.createRequestUpdateCells({
                  cells: gSheetCells,
                  range: {
                    sheetId: window.abwa.specific.mappingStudyManager.mappingStudy.sheetId,
                    startRowIndex: window.abwa.specific.primaryStudySheetManager.primaryStudyRow,
                    startColumnIndex: startIndex,
                    endRowIndex: window.abwa.specific.primaryStudySheetManager.primaryStudyRow + 1,
                    endColumnIndex: lastColumnIndex
                  }
                })
                requests.push(updateCellsRequest)
                window.abwa.specific.primaryStudySheetManager.googleSheetClientManager.googleSheetClient.batchUpdate({
                  spreadsheetId: window.abwa.specific.mappingStudyManager.mappingStudy.spreadsheetId,
                  requests: requests
                }, (err, result) => {
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
      }
    })
  }

  static updateClassificationInductive (facetAnnotations, facet, callback) {
    if (facetAnnotations.length === 0) { // If no annotations for this facet, clean cell value
      // TODO Clear cell
      CommonHypersheetManager.cleanMonovaluedFacetInGSheet(facet.name, (err, result) => {
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
    } else {
      // Check if more than one user has classified the facet
      let uniqueUsers = _.uniq(_.map(facetAnnotations, (facetAnnotation) => { return facetAnnotation.user }))
      // If more than one yellow, in other case white
      let color = uniqueUsers.length > 1 ? HyperSheetColors.yellow : HyperSheetColors.white
      CommonHypersheetManager.updateInductiveFacetInGSheet(facet.name, facetAnnotations[0], color, (err, result) => {
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
  }

  /**
   *
   * @param {String} facetName
   * @param annotation
   * @param {Object} backgroundColor
   * @param {Function} callback
   */
  static updateInductiveFacetInGSheet (facetName, annotation, backgroundColor, callback) {
    // Retrieve link for primary study
    window.abwa.specific.primaryStudySheetManager.getPrimaryStudyLink((err, primaryStudyLink) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        // Get link for cell
        let link = CommonHypersheetManager.getAnnotationUrl(annotation, primaryStudyLink)
        // Retrieve row and cell
        let row = window.abwa.specific.primaryStudySheetManager.primaryStudyRow // It is already updated by getPrimaryStudyLink
        let sheetData = window.abwa.specific.primaryStudySheetManager.sheetData
        let column = _.findIndex(sheetData.data[0].rowData[0].values, (cell) => {
          return cell.formattedValue === facetName
        })
        // Retrieve value for the cell (text annotated)
        let value = CommonHypersheetManager.getAnnotationValue(annotation)
        if (row > 0 && column > 0 && _.isString(link)) {
          window.abwa.specific.primaryStudySheetManager.googleSheetClientManager.googleSheetClient.updateCell({
            row: row,
            column: column,
            value: value,
            link: link,
            backgroundColor: backgroundColor,
            spreadsheetId: window.abwa.specific.mappingStudyManager.mappingStudy.spreadsheetId,
            sheetId: window.abwa.specific.mappingStudyManager.mappingStudy.sheetId
          }, (err, result) => {
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
        } else {
          if (_.isFunction(callback)) {
            if (row > 0 && column > 0) {
              callback(new Error('Column or row is not found in hypersheet'))
            } else {
              callback(new Error('Unable to create the link to the annotation'))
            }
          }
        }
      }
    })
  }

  static updateClassificationMonovalued (facetAnnotations, facetName, callback) {
    if (facetAnnotations.length === 0) { // If no annotations for this facet, clean cell value
      // Clear cell
      CommonHypersheetManager.cleanMonovaluedFacetInGSheet(facetName, (err, result) => {
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
    } else {
      // Order by date
      let orderedFacetAnnotations = _.reverse(_.sortBy(facetAnnotations, (annotation) => { return new Date(annotation.updated) }))
      // If newest annotation is validation, validate, else, remove all validations from facetAnnotations array
      if (_.find(orderedFacetAnnotations[0].tags, (tag) => { return tag === this.tags.validated })) {
        // Get the annotation who is referenced by validation
        let validatedAnnotation = _.find(facetAnnotations, (annotation) => { return annotation.id === orderedFacetAnnotations[0].references[0] })
        let codeNameTag = _.find(validatedAnnotation, (tag) => { return tag.includes(CommonHypersheetManager.tags.code) })
        let codeName = codeNameTag.replace(CommonHypersheetManager.tags.code, '')
        CommonHypersheetManager.updateMonovaluedFacetInGSheet(facetName, codeName, validatedAnnotation, HyperSheetColors.green, (err, result) => {
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
      } else {
        facetAnnotations = _.filter(facetAnnotations, (annotation) => {
          return _.find(annotation.tags, (tag) => { return tag !== this.tags.validated })
        })
        // Retrieve oldest annotation's code
        let codeNameTag = _.find(facetAnnotations[0].tags, (tag) => { return tag.includes(CommonHypersheetManager.tags.code) })
        if (!_.isString(codeNameTag)) {
          if (_.isFunction(callback)) {
            callback(new Error('Error while updating hypersheet. Oldest annotation hasn\'t code tag'))
          }
        } else {
          let codeName = codeNameTag.replace(CommonHypersheetManager.tags.code, '')
          if (facetAnnotations.length > 1) { // Other annotations are with same facet
            // Retrieve all used codes to classify the current facet
            let uniqueCodes = _.uniq(_.map(facetAnnotations, (facetAnnotation) => {
              return _.find(facetAnnotation.tags, (tag) => {
                return tag.includes(CommonHypersheetManager.tags.code)
              })
            }))
            if (uniqueCodes.length > 1) { // More than one is used, red background
              // Set in red background and maintain the oldest one annotation code
              CommonHypersheetManager.updateMonovaluedFacetInGSheet(facetName, codeName, facetAnnotations[0], HyperSheetColors.red, (err, result) => {
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
            } else {
              // Retrieve users who use the code in facet
              let uniqueUsers = _.uniq(_.map(facetAnnotations, (facetAnnotation) => { return facetAnnotation.user }))
              if (uniqueUsers.length > 1) { // More than one reviewer has classified using same facet and code
                // Set in yellow background
                CommonHypersheetManager.updateMonovaluedFacetInGSheet(facetName, codeName, facetAnnotations[0], HyperSheetColors.yellow, (err, result) => {
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
              } else {
                // Is the same user with the same code, set in white background with the unique code
                CommonHypersheetManager.updateMonovaluedFacetInGSheet(facetName, codeName, facetAnnotations[0], HyperSheetColors.white, (err, result) => {
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
            }
          } else { // No other annotation is found with same facet
            CommonHypersheetManager.updateMonovaluedFacetInGSheet(facetName, codeName, facetAnnotations[0], HyperSheetColors.white, (err, result) => {
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
        }
      }
    }
  }

  static cleanMonovaluedFacetInGSheet (facetName, callback) {
    window.abwa.specific.primaryStudySheetManager.getGSheetData((err, sheetData) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        window.abwa.specific.primaryStudySheetManager.retrievePrimaryStudyRow((err, row) => {
          if (err) {
            callback(err)
          } else {
            let column = _.findIndex(sheetData.data[0].rowData[0].values, (cell) => {
              return cell.formattedValue === facetName
            })
            if (row !== 0 && column !== 0) {
              let request = window.abwa.specific.primaryStudySheetManager.googleSheetClientManager.googleSheetClient.createRequestUpdateCell({
                row: row,
                column: column,
                value: '',
                backgroundColor: HyperSheetColors.white,
                sheetId: window.abwa.specific.mappingStudyManager.mappingStudy.sheetId
              })
              window.abwa.specific.primaryStudySheetManager.googleSheetClientManager.googleSheetClient.batchUpdate({
                spreadsheetId: window.abwa.specific.mappingStudyManager.mappingStudy.spreadsheetId,
                requests: [request]
              }, (err, result) => {
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
          }
        }, true)
      }
    })
  }

  static updateMonovaluedFacetInGSheet (facetName, codeName, currentAnnotation, color, callback) {
    // Retrieve link for primary study
    window.abwa.specific.primaryStudySheetManager.getPrimaryStudyLink((err, primaryStudyLink) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        // Get link for cell
        let link = CommonHypersheetManager.getAnnotationUrl(currentAnnotation, primaryStudyLink)
        // Retrieve row and cell
        let row = window.abwa.specific.primaryStudySheetManager.primaryStudyRow // It is already updated by getPrimaryStudyLink call
        let sheetData = window.abwa.specific.primaryStudySheetManager.sheetData
        let column = _.findIndex(sheetData.data[0].rowData[0].values, (cell) => {
          return cell.formattedValue === facetName
        })
        if (row !== 0 && column !== 0 && _.isString(link)) {
          // Create request to send to google sheet api
          let request = window.abwa.specific.primaryStudySheetManager.googleSheetClientManager.googleSheetClient.createRequestUpdateCell({
            row: row,
            column: column,
            value: codeName,
            link: link,
            backgroundColor: color,
            sheetId: window.abwa.specific.mappingStudyManager.mappingStudy.sheetId
          })
          window.abwa.specific.primaryStudySheetManager.googleSheetClientManager.googleSheetClient.batchUpdate({
            spreadsheetId: window.abwa.specific.mappingStudyManager.mappingStudy.spreadsheetId,
            requests: [request]
          }, (err, result) => {
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
      }
    })
  }

  static createGSheetCellsFromCodeCells (codeCells, callback) {
    window.abwa.specific.primaryStudySheetManager.getPrimaryStudyLink((err, primaryStudyLink) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        let gSheetCells = []
        for (let i = 0; i < codeCells.length; i++) {
          let codeCell = codeCells[i]
          let link = CommonHypersheetManager.getAnnotationUrl(codeCell.annotation, primaryStudyLink)
          let value = codeCell.code
          let formulaValue = '=HYPERLINK("' + link + '"; "' + value.replace(/"/g, '""') + '")'
          if (!_.isNaN(_.toNumber(value))) { // If is a number, change
            formulaValue = '=HYPERLINK("' + link + '"; ' + _.toNumber(value) + ')'
          }
          gSheetCells.push({
            'userEnteredFormat': {
              'backgroundColor': codeCell.color
            },
            'userEnteredValue': {
              'formulaValue': formulaValue
            }
          })
        }
        if (_.isFunction(callback)) {
          callback(null, gSheetCells)
        }
      }
    })
  }

  static getAllAnnotations (callback) {
    // Retrieve annotations for current url and group
    window.abwa.hypothesisClientManager.hypothesisClient.searchAnnotations({
      url: window.abwa.contentTypeManager.getDocumentURIToSearchInHypothesis(),
      uri: window.abwa.contentTypeManager.getDocumentURIToSaveInHypothesis(),
      group: window.abwa.groupSelector.currentGroup.id,
      order: 'asc'
    }, (err, annotations) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        // Search tagged annotations
        let tagList = window.abwa.tagManager.getTagsList()
        let taggedAnnotations = []
        for (let i = 0; i < annotations.length; i++) {
          // Check if annotation contains a tag of current group
          let tag = TagManager.retrieveTagForAnnotation(annotations[i], tagList)
          if (tag) {
            taggedAnnotations.push(annotations[i])
          } else {
            // If has validated tag
            if (_.find(annotations[i].tags, (tag) => { return tag === this.tags.validated })) {
              taggedAnnotations.push(annotations[i])
            }
          }
        }
        if (_.isFunction(callback)) {
          callback(null, taggedAnnotations)
        }
      }
    })
  }

  /**
   *
   * @param annotations
   * @param users
   * @param code
   * @returns {boolean} True if all users have an annotation with this code
   */
  static allUsersHaveCode (annotations, users, codeTag) {
    for (let i = 0; i < users.length; i++) {
      let user = users[i]
      let annotation = _.find(annotations, (annotation) => {
        return annotation.user === user && _.find(annotation.tags, (tag) => {
          return tag === codeTag
        })
      })
      if (!_.isObject(annotation)) {
        return false
      }
    }
    return true
  }

  static getAnnotationUrl (annotation, primaryStudyURL) {
    if (primaryStudyURL) {
      return primaryStudyURL + '#hag:' + annotation.id
    } else {
      if (window.abwa.contentTypeManager.doi) {
        return 'https://doi.org/' + window.abwa.contentTypeManager.doi + '#hag:' + annotation.id
      } else {
        return annotation.uri + '#hag:' + annotation.id
      }
    }
  }

  static getAnnotationValue (annotation) {
    let selector = _.find(annotation.target[0].selector, (selector) => { return selector.type === 'TextQuoteSelector' })
    if (_.has(selector, 'exact')) {
      return selector.exact
    } else {
      return null
    }
  }

  static isValidatedAnnotationNewest (facetAnnotations, uniqCodeTag) {
    let validatedAnnotations = _.filter(facetAnnotations, (annotation) => {
      return _.find(annotation.tags, (tag) => {
        return tag === CommonHypersheetManager.tags.validated
      })
    })
    let codeAnnotations = _.filter(facetAnnotations, (facetAnnotation) => { return _.find(facetAnnotation.tags, (tag) => { return tag === uniqCodeTag }) })
    // Check if any of the validated annotations is for current code
    let validatedAnnotationsForCode = _.filter(validatedAnnotations, (validatedAnnotation) => {
      return _.find(codeAnnotations, (codeAnnotation) => {
        return _.find(validatedAnnotation.references, (reference) => {
          return reference === codeAnnotation.id
        })
      })
    })
    if (validatedAnnotationsForCode.length > 0) {
      let orderedAnnotations = _.reverse(_.sortBy(_.concat(codeAnnotations, validatedAnnotationsForCode), (annotation) => {
        return new Date(annotation.updated)
      }))
      // If newest annotation is validation
      if (_.find(orderedAnnotations[0].tags, (tag) => { return tag === this.tags.validated })) {
        console.log('Validated %s', uniqCodeTag)
        return orderedAnnotations[0]
      } else {
        return null
      }
    } else {
      return null
    }
  }
}

CommonHypersheetManager.tags = {
  isCodeOf: Config.slrDataExtraction.namespace + ':' + Config.slrDataExtraction.tags.grouped.relation + ':',
  facet: Config.slrDataExtraction.namespace + ':' + Config.slrDataExtraction.tags.grouped.group + ':',
  code: Config.slrDataExtraction.namespace + ':' + Config.slrDataExtraction.tags.grouped.subgroup + ':',
  validated: Config.slrDataExtraction.namespace + ':' + Config.slrDataExtraction.tags.statics.validated
}

module.exports = CommonHypersheetManager
