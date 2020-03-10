import ChromeStorage from '../../utils/ChromeStorage'
import URLUtils from '../../utils/URLUtils'
import BrowserStorageClient from './BrowserStorageClient'
import AnnotationServerManager from '../AnnotationServerManager'
// const mockDatabase = require('./mockDatabase')
import EmptyDatabase from './EmptyDatabase'
import _ from 'lodash'

class BrowserStorageManager extends AnnotationServerManager {
  constructor () {
    super()
    this.browserStorageClient = this.client
    this.annotationsDatabase = {}
  }

  init (callback) {
    // Retrieve database of annotations
    ChromeStorage.getData('db.annotations', ChromeStorage.local, (err, data) => {
      if (err) {
        callback(err)
      } else {
        if (_.isString(data)) {
          // Parse
          try {
            this.annotationsDatabase = JSON.parse(data)
          } catch (e) {
            this.annotationsDatabase = EmptyDatabase
          } finally {
            this.client = new BrowserStorageClient(this.annotationsDatabase, this)
          }
        } else {
          // Load empty database
          this.annotationsDatabase = EmptyDatabase
          this.client = new BrowserStorageClient(this.annotationsDatabase, this)
        }
        // Callback
        callback()
      }
    })
  }

  saveDatabase (database, callback) {
    let stringifiedDatabase = JSON.stringify(database)
    ChromeStorage.setData('db.annotations', stringifiedDatabase, ChromeStorage.local, (err) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        if (_.isFunction(callback)) {
          callback(null, database)
        }
      }
    })
  }

  constructSearchUrl (obj) {
    let hashParam = URLUtils.objectToParams(obj)
    return chrome.extension.getURL('content/browserStorage/browserStorageSearch.html') + '#' + hashParam
  }

  cleanDatabase (callback) {
    ChromeStorage.setData('db.annotations', 1, ChromeStorage.local, (err) => {
      if (_.isFunction(callback)) {
        if (err) {
          callback(err)
        } else {
          callback(null)
        }
      }
    })
  }
}

export default BrowserStorageManager
