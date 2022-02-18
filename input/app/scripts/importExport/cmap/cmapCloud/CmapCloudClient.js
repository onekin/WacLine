import _ from 'lodash'
import LanguageUtils from '../../../utils/LanguageUtils'
import $ from 'jquery'

class CmapCloudClient {
  constructor (user, password, uid) {
    this.user = user
    this.password = password
    this.uid = uid
    let auth = user + ':' + password
    this.basicAuth = btoa(auth)
  }

  getRootFolderInfor (callback) {
    chrome.runtime.sendMessage({
      scope: 'cmapCloud',
      cmd: 'getRootFolderInfo',
      data: { uid: this.uid }
    }, (response) => {
      if (response.info) {
        let parser = new DOMParser()
        let xmlDoc = parser.parseFromString(response.info, 'text/xml')
        callback(xmlDoc)
        // validated
      } else if (response.err) {
        // Not validated
        callback(null)
      }
    })
  }

  createFolder (folderName, callback) {
    let settings = {
      url: 'https://cmapscloud.ihmc.us:443/resources/id=uid=' + this.uid + ',ou=users,dc=cmapcloud,dc=ihmc,dc=us/?cmd=create.folder.with.name&name=' + folderName + '&userDN=uid=' + this.uid + ',ou=users,dc=cmapcloud,dc=ihmc,dc=us',
      method: 'POST',
      timeout: 0,
      headers: {
        Authorization: 'Basic ' + this.basicAuth,
        'Content-Type': 'application/xml'
      },
      data: '<res-meta xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:vCard="http://www.w3.org/2001/vcard-rdf/3.0#">\n' +
        '<dc:title>CreateFolder</dc:title>\n' +
        '<dc:format>x-nlk-project/x-binary</dc:format>\n' +
        '<dc:description>No description</dc:description>\n' +
        '<dc:creator>\n' +
        '\t<vCard:FN>uid=' + this.uid + ',ou=users,dc=cmapcloud,dc=ihmc,dc=us</vCard:FN>\n' +
        '\t<vCard:EMAIL />\n' +
        '</dc:creator>\n' +
        '<dcterms:rightsHolder>\n' +
        '\t<vCard:FN>uid=' + this.uid + ',ou=users,dc=cmapcloud,dc=ihmc,dc=us</vCard:FN>\n' +
        '\t<vCard:EMAIL />\n' +
        '</dcterms:rightsHolder>\n' +
        '</res-meta>\n' +
        '\n' +
        '<acl-info inherit="true" />'
    }

    $.ajax(settings).done(function (response) {
      if (_.isFunction(callback)) {
        callback(response)
      }
    })
  }

  uploadWebResource (folderID, resource, callback) {
    let settings = {
      url: 'https://cmapscloud.ihmc.us:443/resources/rid=' + folderID + '/?cmd=begin.creating.resource',
      method: 'POST',
      timeout: 0,
      headers: {
        Authorization: 'Basic ' + this.basicAuth,
        'Content-Type': 'application/xml'
      },
      data: '<res-meta xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">\n' +
        '<dc:title>' + resource.name + '</dc:title>\n' +
        '<dc:description>No description</dc:description>\n' +
        '<dc:format>text/x-url</dc:format>\n' +
        '</res-meta>'
    }

    $.ajax(settings).done((token) => {
      this.uploadWebResourceBody(token, resource, callback)
    })
  }

  uploadWebResourceBody (token, resource, callback) {
    let settings = {
      url: 'https://cmapscloud.ihmc.us:443/resources/rid=' + token + '/?cmd=write.resource.part&partname=url&mimetype=text/x-url',
      method: 'POST',
      timeout: 0,
      headers: {
        Authorization: 'Basic ' + this.basicAuth,
        'Content-Type': 'text/plain'
      },
      data: resource.direction + '\n' +
        '[DEFAULT]\n' +
        'BASEURL=' + resource.direction + '\n' +
        '[InternetShortcut]\n' +
        'URL=' + resource.direction
    }

    $.ajax(settings).done((response) => {
      this.uploadConfirm(token, callback)
    })
  }

  uploadConfirm (token, callback) {
    let settings = {
      url: 'https://cmapscloud.ihmc.us:443/resources/rid=' + token + '/?cmd=done.saving.resource',
      method: 'POST',
      timeout: 0
    }

    $.ajax(settings).done(function (response) {
      if (_.isFunction(callback)) {
        callback(response)
      }
    })
  }

  uploadMap (folderID, map, callback) {
    let settings = {
      url: 'https://cmapscloud.ihmc.us:443/resources/rid=' + folderID + '/?cmd=begin.creating.resource',
      method: 'POST',
      timeout: 0,
      headers: {
        Authorization: 'Basic ' + this.basicAuth,
        'Content-Type': 'application/xml'
      },
      data: '<res-meta xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">\n' +
        '<dc:title>' + LanguageUtils.camelize(window.abwa.groupSelector.currentGroup.name) + '</dc:title>\n' +
        '<dc:description>No description</dc:description>\n' +
        '<dc:format>x-cmap/x-storable</dc:format>\n' +
        '</res-meta>'
    }

    $.ajax(settings).done((token) => {
      this.uploadMapBody(token, map, callback)
    })
  }

  uploadMapBody (token, map, callback) {
    let settings = {
      url: 'https://cmapscloud.ihmc.us:443/resources/rid=' + token + '/?cmd=write.resource.part&partname=cmap&mimetype=XML',
      method: 'POST',
      timeout: 0,
      headers: {
        Authorization: 'Basic ' + this.basicAuth,
        'Content-Type': 'text/plain'
      },
      data: map
    }

    $.ajax(settings).done((response) => {
      this.uploadConfirm(token, callback)
    })
  }
}

export default CmapCloudClient
