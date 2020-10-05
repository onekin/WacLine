import CmapCloudClient from './CmapCloudClient'
import _ from 'lodash'
import Alerts from '../../../utils/Alerts'
import LanguageUtils from '../../../utils/LanguageUtils'
import FileSaver from 'file-saver'

class ExportCmapCloud {
  static export (xmlDoc, urlFiles, userData) {
    let user = userData.user
    let pass = userData.password
    let uid = userData.uid
    let cmapCloudClient = new CmapCloudClient(user, pass, uid)
    cmapCloudClient.getRootFolderInfor((data) => {
      let folderName = this.getFolderName(data)
      cmapCloudClient.createFolder(folderName, (newFolderData) => {
        let folderID = this.getFolderID(newFolderData)
        let beginPromises = []
        for (let i = 0; i < urlFiles.length; i++) {
          let urlFile = urlFiles[i]
          let beginPromise = new Promise((resolve, reject) => {
            cmapCloudClient.uploadWebResource(folderID, urlFile, (data) => {
              resolve(data)
            })
          })
          beginPromises.push(beginPromise)
        }
        Promise.all(beginPromises).then(createdResources => {
          // Results
          let createdResourcesID = _.map(createdResources, (res) => {
            let retrieve = res.all[3].innerHTML.match(/id=[\s\S]*.url/)[0]
            let resourceIDName = retrieve.replace('.url', '').replace('id=', '')
            return resourceIDName
          })
          for (let j = 0; j < createdResourcesID.length; j++) {
            let id = createdResourcesID[j].split('/')[0]
            let name = createdResourcesID[j].split('/')[1]
            let urlFile = _.find(urlFiles, (file) => {
              return file.name === name
            })
            if (urlFile) {
              urlFile.id = id
            }
          }
          // Add resource-group-list
          this.referenceURLIntoMap(xmlDoc, urlFiles, folderID)
          let mapString = new XMLSerializer().serializeToString(xmlDoc)
          let blob = new window.Blob([mapString], {
            type: 'text/plain;charset=utf-8'
          })
          FileSaver.saveAs(blob, LanguageUtils.camelize(folderName) + '.cxl')
          Alerts.infoAlert({ text: 'You have available your resource in CmapCloud in ' + folderName + ' folder.\n Please move the downloaded map to the corresponding CmapCloud folder.', title: 'Completed' })
          // })
        }, reason => {
        })
      })
    })
  }

  static getFolderName (data) {
    let folderName
    let elements = data.getElementsByTagName('res-meta')
    if (elements.length > 0) {
      let folderElements = _.map(_.filter(elements, (element) => {
        if (element.attributes.format) {
          return element.attributes.format.nodeValue === 'x-nlk-project/x-binary'
        }
      }), (folderElement) => {
        return folderElement.attributes.title.nodeValue
      })
      let candidateName
      let foundFolder
      let i = 1
      while (true) {
        candidateName = window.abwa.groupSelector.currentGroup.name + '_v.' + i
        foundFolder = _.filter(folderElements, (folderName) => {
          return folderName === candidateName
        })
        if (foundFolder.length === 0) {
          return candidateName
        } else {
          i++
        }
      }
    } else {
      folderName = window.abwa.groupSelector.currentGroup.name + '_v.1'
      return folderName
    }
  }

  static getFolderID (data) {
    let identifier = data.getElementsByTagName('dc:identifier')[0].innerHTML.match(/id=(\w+)-(\w+)-(\w+)/)[0]
    let folderID = identifier.toString().replace('id=', '')
    return folderID
  }

  static referenceURLIntoMap (xmlDoc, urlFiles, folderID) {
    let resourceGroupListElement = xmlDoc.getElementsByTagName('resource-group-list')[0]
    let resourcesMap = _.chain(urlFiles)
      .groupBy('parentId')
      .toPairs()
      .map(pair => _.zipObject(['parentId', 'urls'], pair))
      .value()
    for (let i = 0; i < resourcesMap.length; i++) {
      let resource = resourcesMap[i]
      let resourceGroupElement = xmlDoc.createElement('resource-group')
      let resourceGroupIdAttribute = document.createAttribute('parent-id')
      resourceGroupIdAttribute.value = resource.parentId
      resourceGroupElement.setAttributeNode(resourceGroupIdAttribute)
      let groupTypeIdAttribute = document.createAttribute('group-type')
      groupTypeIdAttribute.value = 'text-and-image'
      resourceGroupElement.setAttributeNode(groupTypeIdAttribute)
      for (let j = 0; j < resource.urls.length; j++) {
        let url = resource.urls[j]
        let resourceElement = xmlDoc.createElement('resource')
        let resourceElementLabelAttribute = document.createAttribute('label')
        resourceElementLabelAttribute.value = url.name
        resourceElement.setAttributeNode(resourceElementLabelAttribute)
        let resourceElementNameAttribute = document.createAttribute('resource-name')
        resourceElementNameAttribute.value = url.name
        resourceElement.setAttributeNode(resourceElementNameAttribute)
        let resourceElementURLAttribute = document.createAttribute('resource-url')
        resourceElementURLAttribute.value = 'https://cmapscloud.ihmc.us:443/id=' + url.id + '/' + url.name + '.url?redirect'
        resourceElement.setAttributeNode(resourceElementURLAttribute)
        let resourceElementIdAttribute = document.createAttribute('resource-id')
        resourceElementIdAttribute.value = url.id
        resourceElement.setAttributeNode(resourceElementIdAttribute)
        let resourceFolderIdAttribute = document.createAttribute('resource-folder-id')
        resourceFolderIdAttribute.value = folderID
        resourceElement.setAttributeNode(resourceFolderIdAttribute)
        let resourceServerIdAttribute = document.createAttribute('resource-server-id')
        resourceServerIdAttribute.value = '1MHZH5RK6-2C8DRLF-1'
        resourceElement.setAttributeNode(resourceServerIdAttribute)
        let resourceElementMimetypeAttribute = document.createAttribute('resource-mimetype')
        resourceElementMimetypeAttribute.value = 'text/x-url'
        resourceElement.setAttributeNode(resourceElementMimetypeAttribute)
        resourceGroupElement.appendChild(resourceElement)
      }
      resourceGroupListElement.appendChild(resourceGroupElement)
    }
    let mapString = new XMLSerializer().serializeToString(xmlDoc)
    return mapString
  }
}

export default ExportCmapCloud
