const _ = require('lodash')
const URLUtils = require('../utils/URLUtils')
const ChromeStorage = require('../utils/ChromeStorage')

class MoodleDownloadManager {
  constructor () {
    this.files = {}
  }

  init () {
    chrome.downloads.onCreated.addListener((downloadItem) => {
      // Get required data to mark on moodle
      let hashParams = URLUtils.extractHashParamsFromUrl(downloadItem.url, ':')
      let studentId = hashParams['studentId']
      let courseId = hashParams['courseId']
      let cmid = hashParams['cmid']
      if (_.isString(studentId)) { // File is downloaded from moodle
        // Save file metadata and data to mark on moodle
        this.files[downloadItem.id] = {
          url: URLUtils.retrieveMainUrl(downloadItem.url),
          studentId: studentId,
          courseId: courseId,
          cmid: cmid,
          mag: hashParams['mag'] || null
        }
      }
    })

    chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
      if (this.files[downloadItem.id]) { // Only for files downloaded from moodle
        ChromeStorage.getData('fileFormats', ChromeStorage.sync, (err, fileExtensions) => {
          if (err) {
            suggest() // Suggest default
          } else {
            let fileExtensionArray = []
            if (fileExtensions) {
              fileExtensionArray = (JSON.parse(fileExtensions.data) + defaultFileExtensionsAsPlainText).split(',')
            } else {
              fileExtensionArray = defaultFileExtensionsAsPlainText.split(',')
            }
            let originalFilenameExtension = _.last(downloadItem.filename.split('.'))
            let matchExtension = _.find(fileExtensionArray, (ext) => { return ext === originalFilenameExtension })
            if (_.isString(matchExtension)) {
              suggest({filename: downloadItem.filename + '.txt'})
            } else {
              suggest()
            }
          }
        })
        // Async suggestion
        return true
      } else {
        return false
      }
    })

    chrome.downloads.onChanged.addListener((downloadItem) => {
      // Download is pending
      if (this.files[downloadItem.id] && downloadItem.filename && downloadItem.filename.current) {
        // Save download file path
        let files = _.values(_.forIn(window.background.moodleDownloadManager.files, (file, key) => { file.key = key }))
        if (downloadItem.filename.current.startsWith('/')) { // Unix-based filesystem
          let repeatedLocalFiles = _.filter(files, (file) => { return file.localPath === encodeURI('file://' + downloadItem.filename.current) })
          _.forEach(repeatedLocalFiles, (repeatedLocalFiles) => {
            delete window.background.moodleDownloadManager.files[repeatedLocalFiles.key]
          })
          this.files[downloadItem.id]['localPath'] = encodeURI('file://' + downloadItem.filename.current)
        } else { // Windows-based filesystem
          let repeatedLocalFiles = _.filter(files, (file) => { return file.localPath === encodeURI('file:///' + _.replace(downloadItem.filename.current, /\\/g, '/')) })
          _.forEach(repeatedLocalFiles, (repeatedLocalFiles) => {
            delete window.background.moodleDownloadManager.files[repeatedLocalFiles.key]
          })
          this.files[downloadItem.id]['localPath'] = encodeURI('file:///' + _.replace(downloadItem.filename.current, /\\/g, '/'))
        }
      } else if (_.isObject(downloadItem.state) && downloadItem.state.current === 'complete') { // When the download is finished
        // If mag is set in the URL, open a new tab with the document
        if (this.files[downloadItem.id]['mag'] && this.files[downloadItem.id]['studentId']) {
          let localUrl = this.files[downloadItem.id]['localPath'] + '#mag:' + this.files[downloadItem.id]['mag'] + '&studentId:' + this.files[downloadItem.id]['studentId']
          chrome.extension.isAllowedFileSchemeAccess((isAllowedAccess) => {
            if (isAllowedAccess === false) {
              chrome.tabs.create({ url: chrome.runtime.getURL('pages/filePermission.html') })
            } else {
              // Open the file automatically
              chrome.tabs.create({url: localUrl}, () => {
                this.files[downloadItem.id]['mag'] = null
              })
            }
          })
        } else {
          // Check if auto-open option is activated
          ChromeStorage.getData('autoOpenFiles', ChromeStorage.sync, (err, result) => {
            if (err) {

            } else {
              let autoOpen = result.activated // TODO Change
              if (autoOpen) {
                let localUrl = this.files[downloadItem.id]['localPath'] + '#autoOpen:true'
                // Check if permission to access files is enabled, otherwise open a new tab with the message.
                chrome.extension.isAllowedFileSchemeAccess((isAllowedAccess) => {
                  if (isAllowedAccess === false) {
                    chrome.tabs.create({ url: chrome.runtime.getURL('pages/filePermission.html') })
                  } else {
                    // Open the file automatically
                    chrome.tabs.create({url: localUrl})
                  }
                })
              }
            }
          })
        }
      }
    })

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'annotationFile') {
        if (request.cmd === 'fileMetadata') {
          if (request.data.filepath) {
            let file = _.find(this.files, (file) => {
              if (file.localPath === request.data.filepath) {
                return file
              }
            })
            sendResponse({file: file})
          }
        } else if (request.cmd === 'setPlainTextFileExtension') {
          // Save file formats
          ChromeStorage.setData('fileFormats', {data: JSON.stringify(request.data.fileExtensions)}, ChromeStorage.sync, () => {
            sendResponse({err: null})
          })
        } else if (request.cmd === 'getPlainTextFileExtension') {
          // Retrieve from chrome storage file formats and return to user
          ChromeStorage.getData('fileFormats', ChromeStorage.sync, (err, fileExtensions) => {
            if (err) {
              sendResponse({err: err})
            } else {
              if (fileExtensions) {
                let parsedFileExtensions = JSON.parse(fileExtensions.data)
                sendResponse({fileExtensions: parsedFileExtensions || ''})
              } else {
                sendResponse({fileExtensions: ''})
              }
            }
          })
        }
      }
    })
  }
}

const defaultFileExtensionsAsPlainText = 'xml,xsl,xslt,xquery,xsql,'

module.exports = MoodleDownloadManager
