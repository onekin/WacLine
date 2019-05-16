const _ = require('lodash')
const HypothesisClientManager = require('../hypothesis/HypothesisClientManager')
const GoogleSheetsClientManager = require('../googleSheets/GoogleSheetsClientManager')
const GoogleSheetParser = require('./GoogleSheetParser')
const HypothesisGroupInitializer = require('./HypothesisGroupInitializer')
const Alerts = require('../utils/Alerts')
const swal = require('sweetalert2')

class GoogleSheetContentScriptManager {
  init (callback) {
    window.hag.googleSheetClientManager = new GoogleSheetsClientManager()
    window.hag.hypothesisClientManager = new HypothesisClientManager()
    window.hag.hypothesisClientManager.init(() => {
      this.initLoginProcess((err, tokens) => {
        if (err) {
          swal('Oops!',
            'Unable to configure current spreadsheet. Failed login to services.', // TODO i18n
            'error') // Notify error to user
          if (_.isFunction(callback)) {
            callback()
          }
        } else {
          // Show tool is configuring prompt
          this.showToolIsConfiguring()
          console.debug('Correctly logged in to hypothesis: %s', tokens.hypothesis)
          console.debug('Correctly logged in to gSheet: %s', tokens.gSheet)
          this.initGoogleSheetParsing(() => {
            // Execute callback without errors
            if (_.isFunction(callback)) {
              callback()
            }
          })
        }
      })
    })
  }

  showToolIsConfiguring () {
    swal({
      position: 'top-end',
      title: 'Configuring the tool, please be patient', // TODO i18n
      text: 'If the tool takes too much time, please reload the page and try again.',
      showConfirmButton: false,
      onOpen: () => {
        swal.showLoading()
      }
    })
  }

  initLoginProcess (callback) {
    window.hag.hypothesisClientManager.logInHypothesis((err, hypothesisToken) => {
      if (err) {
        callback(err)
      } else {
        window.hag.googleSheetClientManager.logInGoogleSheets((err, gSheetToken) => {
          if (err) {
            callback(err)
          } else {
            callback(null, {
              hypothesis: hypothesisToken,
              gSheet: gSheetToken
            })
          }
        })
      }
    })
  }

  initGoogleSheetParsing (callback) {
    window.hag.googleSheetParser = new GoogleSheetParser()
    window.hag.googleSheetParser.parse((err, annotationGuide) => {
      if (err) {
        console.error(err)
        Alerts.errorAlert({text: err.message})
      } else {
        window.hag.HypothesisGroupInitializer = new HypothesisGroupInitializer()
        window.hag.HypothesisGroupInitializer.init(annotationGuide, (err) => {
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

module.exports = GoogleSheetContentScriptManager
