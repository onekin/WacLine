import $ from 'jquery'
require('jquery-csv')

class CSV {
  static retrieveJSONfromCSV (csvUrl, callback) {
    $.get(csvUrl).done((csv) => {
      let csvTransformedObject = $.csv.toObjects(csv)
      callback(csvTransformedObject)
    })
  }
}

export default CSV
