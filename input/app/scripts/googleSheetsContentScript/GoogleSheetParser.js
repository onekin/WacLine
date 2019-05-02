const _ = require('lodash')
const $ = require('jquery')
const swal = require('sweetalert2')
const URLUtils = require('../utils/URLUtils')

const Facet = require('../model/Facet')
const Code = require('../model/Code')
const MappingStudy = require('../model/MappingStudy')

class GoogleSheetParser {
  constructor () {
    this.mappingStudy = null
  }

  parse (callback) {
    this.mappingStudy = new MappingStudy()
    this.mappingStudy.spreadsheetId = this.retrieveSpreadsheetId()
    this.mappingStudy.sheetId = this.retrieveSheetId()
    this.retrieveCurrentToken((err, token) => {
      if (err) {
        callback(err)
      } else {
        this.getSpreadsheet(token, (err, spreadsheet) => {
          if (err) {
            callback(err)
          } else {
            // Retrieve spreadsheet title
            this.mappingStudy.name = spreadsheet.properties.title
            let facets = this.getFacetsAndCodes(spreadsheet)
            if (_.isError(facets)) {
              callback(facets)
            } else {
              this.mappingStudy.facets = facets
              if (_.isFunction(callback)) {
                callback(null, this.mappingStudy)
              }
            }
          }
        })
      }
    })
  }

  retrieveSpreadsheetId () {
    // Get current google sheet id
    this.spreadsheetId = window.location.href.match(/[-\w]{25,}/)[0]
    return window.location.href.match(/[-\w]{25,}/)[0]
  }

  retrieveSheetId () {
    let hashParams = URLUtils.extractHashParamsFromUrl(window.location.href, '=')
    return parseInt(hashParams.gid)
  }

  retrieveCurrentToken (callback) {
    chrome.runtime.sendMessage({scope: 'googleSheets', cmd: 'getToken'}, (result) => {
      if (_.isFunction(callback)) {
        if (result.token) {
          callback(null, result.token)
        } else {
          callback(result.error)
        }
      }
    })
  }

  getSpreadsheet (token, callback) {
    $.ajax({
      method: 'GET',
      url: 'https://sheets.googleapis.com/v4/spreadsheets/' + this.mappingStudy.spreadsheetId,
      data: {
        includeGridData: true
      },
      headers: {
        'Authorization': 'Bearer ' + token
      }
    }).done((spreadsheet) => {
      callback(null, spreadsheet)
    }).fail(() => {
      swal('Oops!', // TODO i18n
        'You don\'t have permission to access the spreadsheet! Are you using the same Google account for the spreadsheet and for Google Chrome?<br/>If you don\'t know how to solve this problem: Please create on top right: "Share -> Get shareable link", and give edit permission.',
        'error') // Notify error to user
      callback(new Error('Unable to retrieve spreadsheet data. Permission denied.'))
    })
  }

  getFacetsAndCodes (spreadsheet) {
    // Find current sheet
    let sheet = _.find(spreadsheet.sheets, (sheet) => { return sheet.properties.sheetId === this.mappingStudy.sheetId })
    // Check if exists object
    if (sheet && sheet.data && sheet.data[0] && sheet.data[0].rowData && sheet.data[0].rowData[0] && sheet.data[0].rowData[0].values) {
      // Retrieve index of "Author" column
      let indexOfAuthor = _.findIndex(sheet.data[0].rowData[0].values, (cell) => {
        if (cell && cell.formattedValue) {
          return cell.formattedValue.toLowerCase() === 'author'
        } else {
          return false
        }
      })
      // If index of author exists
      if (indexOfAuthor !== -1) {
        // Retrieve facets. Retrieve elements between 2 column and author column, maps "formattedValue"
        let facetsArray = _.map(_.slice(sheet.data[0].rowData[0].values, 1, indexOfAuthor), 'formattedValue')
        let facets = _.map(_.countBy(facetsArray), (numberOfColumns, name) => {
          let facet = new Facet()
          facet.name = name
          facet.multivalued = numberOfColumns > 1
          return facet
        })
        // If facets are found, try to find codes for each
        if (facetsArray.length > 0) {
          // Find codes
          if (sheet.data[0].rowData[1] && sheet.data[0].rowData[1].values) {
            // Get cells for codes
            let values = _.slice(sheet.data[0].rowData[1].values, 1, indexOfAuthor)
            // For each cell
            for (let i = 0; i < facetsArray.length; i++) {
              // Retrieve its facet
              let currentFacetName = facetsArray[i]
              // If facet of current row is text and is a facet and is not already set the possible codes
              let currentFacet = _.find(facets, (facet) => { return facet.name === currentFacetName })
              if (_.isString(currentFacetName) && currentFacet && currentFacet.codes.length === 0) {
                // If cell has data validation "ONE_OF_LIST"
                if (_.isObject(values[i]) && _.isObject(values[i].dataValidation) && values[i].dataValidation.condition.type === 'ONE_OF_LIST') {
                  currentFacet.inductive = false
                  currentFacet.codes = _.map(values[i].dataValidation.condition.values, (value) => { return new Code(value.userEnteredValue, currentFacetName) })
                } else { // If cell has not data validation
                  currentFacet.inductive = true
                }
              }
            }
          }
          return facets
        } else {
          swal('Oops!', // TODO i18n
            'The spreadsheet hasn\'t the correct structure, you have not defined any facet.',
            'error') // Notify error to user
          return new Error('No facet defined')
        }
      } else {
        swal('Oops!', // TODO i18n
          'The spreadsheet hasn\'t the correct structure, "author" column is missing.',
          'error') // Notify error to user
        return new Error('No author found')
      }
    } else {
      swal('Oops!', // TODO i18n
        'The spreadsheet hasn\'t the correct structure. The ROW #1 must contain the facets names for your review.',
        'error') // Notify error to user
      return new Error('Row 1 facet names')
    }
  }
}

module.exports = GoogleSheetParser
