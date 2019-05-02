let $
if (typeof window === 'undefined') {
  $ = require('jquery')(global.window)
} else {
  $ = require('jquery')
}

const _ = require('lodash')

class GoogleSheetClient {
  constructor (token) {
    if (token) {
      this.token = token
    }
    this.baseURI = 'https://sheets.googleapis.com/v4/spreadsheets/'
  }

  getSpreadsheet (spreadsheetId, callback) {
    $.ajax({
      method: 'GET',
      url: this.baseURI + spreadsheetId,
      headers: {
        'Authorization': 'Bearer ' + this.token
      },
      data: {
        includeGridData: true
      }
    }).done((result) => {
      callback(null, result)
    }).fail(() => {
      callback(new Error('Unable to retrieve gsheet'))
    })
  }

  getSheet (sheetData, callback) {
    this.getSpreadsheet(sheetData.spreadsheetId, (err, result) => {
      if (err) {
        callback(err)
      } else {
        // Retrieve sheet by id if defined
        let sheet = _.find(result.sheets, (sheet) => { return sheet.properties.sheetId === parseInt(sheetData.sheetId) })
        if (_.isFunction(callback)) {
          callback(null, sheet)
        }
      }
    })
  }

  getHyperlinkFromCell (cell) {
    // Try to get by hyperlink property
    if (cell.hyperlink) {
      return cell.hyperlink
    } else {
      if (!_.isEmpty(cell.userEnteredValue) && !_.isEmpty(cell.userEnteredValue.formulaValue)) {
        let value = cell.userEnteredValue.formulaValue
        let hyperlinkMatch = value.match(/=hyperlink\("([^"]+)"/i)
        if (!_.isEmpty(hyperlinkMatch) && hyperlinkMatch.length > 1) {
          return hyperlinkMatch[1].replace(/(^\w+:|^)\/\//, '')
        }
      }
    }
  }

  batchUpdate (data, callback) {
    $.ajax({
      async: true,
      crossDomain: true,
      method: 'POST',
      url: 'https://sheets.googleapis.com/v4/spreadsheets/' + data.spreadsheetId + ':batchUpdate',
      headers: {
        'Authorization': 'Bearer ' + this.token,
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        requests: data.requests
      })
    }).done(() => {
      // TODO Manage responses
      if (_.isFunction(callback)) {
        callback(null)
      }
    }).fail((xhr, textStatus) => {
      if (_.isFunction(callback)) {
        callback(new Error('Error in batch update, error: ' + textStatus))
      }
    })
  }

  updateCell (data, callback) {
    let requests = []
    requests.push(this.createRequestUpdateCell(data))
    let batchUpdateData = {
      spreadsheetId: data.spreadsheetId,
      requests: requests
    }
    this.batchUpdate(batchUpdateData, (err) => {
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

  /**
   *
   * @param {{sheetId: number, row: number, column: number, backgroundColor: *, link: string, value: string, numberOfColumns: number, numberOfRows: number}} data
   * @returns {{repeatCell: {range: {sheetId: *|null, startRowIndex: number, endRowIndex: number, startColumnIndex, endColumnIndex: *}, cell: {userEnteredFormat: {backgroundColor}, userEnteredValue: {formulaValue: string}}, fields: string}}}
   */
  createRequestUpdateCell (data) {
    data.numberOfColumns = _.isNumber(data.numberOfColumns) ? data.numberOfColumns : 1
    data.numberOfRows = _.isNumber(data.numberOfRows) ? data.numberOfRows : 1
    let userEnteredValue = null
    if (_.isString(data.link)) {
      let formulaValue = '=HYPERLINK("' + data.link + '"; "' + data.value.replace(/"/g, '""') + '")'
      if (!_.isNaN(_.toNumber(data.value))) { // If is a number, change
        formulaValue = '=HYPERLINK("' + data.link + '"; ' + _.toNumber(data.value) + ')'
      }
      userEnteredValue = {'formulaValue': formulaValue}
    } else {
      userEnteredValue = {'stringValue': data.value}
    }
    return {
      'repeatCell': {
        'range': {
          'sheetId': data.sheetId,
          'startRowIndex': data.row,
          'endRowIndex': data.row + data.numberOfRows,
          'startColumnIndex': data.column,
          'endColumnIndex': data.column + data.numberOfColumns
        },
        'cell': {
          'userEnteredFormat': {
            'backgroundColor': data.backgroundColor
          },
          'userEnteredValue': userEnteredValue
        },
        'fields': 'userEnteredFormat(backgroundColor), userEnteredValue(formulaValue)'
      }
    }
  }

  createRequestUpdateCells (data) {
    return {
      'updateCells': {
        'rows': {
          'values': data.cells
        },
        'fields': '*',
        'range': data.range
      }
    }
  }

  /**
   * Create a request for google sheet to copy a cell from source to destination.
   * @param {{sheetId: number, sourceRow: number, pasteType: string, sourceColumn: number, sourceNumberOfRows: number, sourceNumberOfColumns: number, destinationNumberOfRows: number, destinationNumberOfColumns: number, destinationRow: number, destinationColumn: number}} data
   * @returns {{copyPaste: {source: {sheetId: number|*|null, startRowIndex: *, endRowIndex: *, startColumnIndex: *, endColumnIndex: *}, destination: {sheetId: number|*|null, startRowIndex: *, endRowIndex: *, startColumnIndex: *, endColumnIndex: *}, pasteType: string, pasteOrientation: string}}}
   */
  createRequestCopyCell (data) {
    // TODO Check required params are defined
    data.sourceNumberOfColumns = _.isNumber(data.sourceNumberOfColumns) ? data.sourceNumberOfColumns : 1
    data.sourceNumberOfRows = _.isNumber(data.sourceNumberOfRows) ? data.sourceNumberOfRows : 1
    data.destinationNumberOfColumns = _.isNumber(data.destinationNumberOfColumns) ? data.destinationNumberOfColumns : 1
    data.destinationNumberOfRows = _.isNumber(data.destinationNumberOfRows) ? data.destinationNumberOfRows : 1
    data.pasteType = _.isString(data.pasteType) ? data.pasteType : 'PASTE_NORMAL'
    return {
      'copyPaste': {
        'source': {
          'sheetId': data.sheetId,
          'startRowIndex': data.sourceRow,
          'endRowIndex': data.sourceRow + data.sourceNumberOfRows,
          'startColumnIndex': data.sourceColumn,
          'endColumnIndex': data.sourceColumn + data.sourceNumberOfColumns
        },
        'destination': {
          'sheetId': data.sheetId,
          'startRowIndex': data.destinationRow,
          'endRowIndex': data.destinationRow + data.destinationNumberOfRows,
          'startColumnIndex': data.destinationColumn,
          'endColumnIndex': data.destinationColumn + data.destinationNumberOfColumns
        },
        'pasteType': data.pasteType,
        'pasteOrientation': 'NORMAL'
      }
    }
  }

  /**
   *
   * @param {{sheetId: *, length: number}} data
   * @returns {{appendDimension: {sheetId: *|null, dimension: string, length}}}
   */
  createRequestAppendEmptyColumn (data) {
    return {
      'appendDimension': {
        'sheetId': data.sheetId,
        'dimension': 'COLUMNS',
        'length': data.length
      }
    }
  }

  createRequestInsertEmptyColumn (data) {
    data.numberOfColumns = _.isNumber(data.numberOfColumns) ? data.numberOfColumns : 0
    return {
      'insertDimension': {
        'range': {
          'sheetId': data.sheetId,
          'dimension': 'COLUMNS',
          'startIndex': data.startIndex,
          'endIndex': data.startIndex + data.numberOfColumns
        },
        'inheritFromBefore': false
      }
    }
  }
}

module.exports = GoogleSheetClient
