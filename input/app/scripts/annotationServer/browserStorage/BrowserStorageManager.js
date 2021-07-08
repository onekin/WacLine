import ChromeStorage from '../../utils/ChromeStorage'
import URLUtils from '../../utils/URLUtils'
import BrowserStorageClient from './BrowserStorageClient'
import AnnotationServerManager from '../AnnotationServerManager'
// const mockDatabase = require('./mockDatabase')
import EmptyDatabase from './EmptyDatabase'
import _ from 'lodash'

class BrowserStorageManager extends AnnotationServerManager {
  constructor (namespace = 'db.annotations') {
    super()
    this.namespace = namespace
    this.browserStorageClient = this.client
    this.annotationServerUrl = 'https://localannotationsdatabase.org'
    this.annotationServerMetadata = {
      annotationUrl: 'https://localannotationsdatabase.org/api/annotations/',
      annotationServerUrl: 'https://localannotationsdatabase.org/api',
      groupUrl: 'https://localannotationsdatabase.org/group/',
      userUrl: 'https://localannotationsdatabase.org/users/'
    }
    this.annotationsDatabase = {}
  }

  init (callback) {
    // Retrieve database of annotations
    ChromeStorage.getData(this.namespace, ChromeStorage.local, (err, data) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
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
        if (_.isFunction(callback)) {
          callback()
        }
      }
    })
  }

  saveDatabase (database, callback) {
    const stringifiedDatabase = JSON.stringify(database)
    ChromeStorage.setData(this.namespace, stringifiedDatabase, ChromeStorage.local, (err) => {
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
    const hashParam = URLUtils.objectToParams(obj)
    return chrome.runtime.getURL('content/browserStorage/browserStorageSearch.html') + '#' + hashParam
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
