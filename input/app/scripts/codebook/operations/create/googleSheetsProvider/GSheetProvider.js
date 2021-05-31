import _ from 'lodash'
import GoogleSheetsClientManager from '../../../../googleSheets/GoogleSheetsClientManager'
import GSheetParser from './GSheetParser'
import GroupInitializer from './GroupInitializer'
import Alerts from '../../../../utils/Alerts'
// PVSCL:IFCOND(Hypothesis, LINE)
import HypothesisClientManager from '../../../../annotationServer/hypothesis/HypothesisClientManager'
// PVSCL:ENDCOND
// PVSCL:IFCOND(BrowserStorage, LINE)
import BrowserStorageManager from '../../../../annotationServer/browserStorage/BrowserStorageManager'
// PVSCL:ENDCOND

class GoogleSheetContentScriptManager {
  init (callback) {
    window.googleSheetProvider.googleSheetClientManager = new GoogleSheetsClientManager()
    this.loadAnnotationServer(() => {
      this.initLoginProcess((err, tokens) => {
        if (err) {
          Alerts.errorAlert({
            title: 'Oops!',
            text: 'Unable to configure current spreadsheet. Failed login to services.' // TODO i18n
          })
          if (_.isFunction(callback)) {
            callback()
          }
        } else {
          // Show tool is configuring prompt
          this.showToolIsConfiguring()
          // console.debug('Correctly logged in to hypothesis: %s', tokens.hypothesis)
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
    Alerts.loadingAlert({
      position: Alerts.position.topEnd,
      title: 'Configuring the tool, please be patient', // TODO i18n
      text: 'If the tool takes too much time, please reload the page and try again.'
    })
  }

  initLoginProcess (callback) {
    window.googleSheetProvider.annotationServerManager.logIn((err) => {
      if (err) {
        callback(err)
      } else {
        window.googleSheetProvider.googleSheetClientManager.logInGoogleSheets((err, gSheetToken) => {
          if (err) {
            callback(err)
          } else {
            callback(null, {
              gSheet: gSheetToken
            })
          }
        })
      }
    })
  }

  loadAnnotationServer (callback) {
    // PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren('ps:annotationServer')->pv:Size()=1, LINE)
    // PVSCL:IFCOND(Hypothesis, LINE)
    window.googleSheetProvider.annotationServerManager = new HypothesisClientManager()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(BrowserStorage, LINE)
    window.googleSheetProvider.annotationServerManager = new BrowserStorageManager()
    // PVSCL:ENDCOND
    window.googleSheetProvider.annotationServerManager.init((err) => {
      if (_.isFunction(callback)) {
        if (err) {
          callback(err)
        } else {
          callback()
        }
      }
    })
    // PVSCL:ELSECOND
    chrome.runtime.sendMessage({ scope: 'annotationServer', cmd: 'getSelectedAnnotationServer' }, ({ annotationServer }) => {
      if (annotationServer === 'hypothesis') {
        // Hypothesis
        window.googleSheetProvider.annotationServerManager = new HypothesisClientManager()
      } else {
        // Browser storage
        window.googleSheetProvider.annotationServerManager = new BrowserStorageManager()
      }
      window.googleSheetProvider.annotationServerManager.init((err) => {
        if (_.isFunction(callback)) {
          if (err) {
            callback(err)
          } else {
            callback()
          }
        }
      })
    })
    // PVSCL:ENDCOND
  }

  initGoogleSheetParsing (callback) {
    GSheetParser.parseCurrentSheet((err, codebook) => {
      if (err) {
        console.error(err)
        Alerts.errorAlert({ text: err.message })
      } else {
        window.googleSheetProvider.GroupInitializer = new GroupInitializer()
        window.googleSheetProvider.GroupInitializer.init(codebook, (err) => {
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

export default GoogleSheetContentScriptManager
