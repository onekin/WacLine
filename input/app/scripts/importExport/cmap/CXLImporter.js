import Alerts from '../../utils/Alerts'
import FileUtils from '../../utils/FileUtils'
import LanguageUtils from '../../utils/LanguageUtils'
import Linking from '../../annotationManagement/purposes/linking/Linking'
import Annotation from '../../annotationManagement/Annotation'
import Codebook from '../../codebook/model/Codebook'
import _ from 'lodash'
// PVSCL:IFCOND(Hypothesis,LINE)
import HypothesisClientManager from '../../annotationServer/hypothesis/HypothesisClientManager'
// PVSCL:ENDCOND

class CXLImporter {
  static askUserToImportCxlFile (callback) {
    // Ask user to upload the file
    Alerts.inputTextAlert({
      title: 'Upload your .cxl file',
      html: 'Here you can upload your cmap in the .cxl format.',
      input: 'file',
      callback: (err, file) => {
        if (err) {
          window.alert('An unexpected error happened when trying to load the alert.')
        } else {
          // Read cxl file
          FileUtils.readCXLFile(file, (err, cxlObject) => {
            if (err) {
              callback(new Error('Unable to read cxl file: ' + err.message))
            } else {
              callback(null, cxlObject)
            }
          })
        }
      }
    })
  }


  static askUserRootTheme (themes, callback) {
    let title = 'Select the topic concept of the concept map'
    let showForm = () => {
      // Create form
      let html = ''
      let selectFrom = document.createElement('select')
      selectFrom.id = 'topicConcept'
      themes.forEach(theme => {
        let option = document.createElement('option')
        option.text = theme.name
        option.value = theme.name
        selectFrom.add(option)
      })
      html += 'From:' + selectFrom.outerHTML + '<br>'
      let topicConcept
      Alerts.multipleInputAlert({
        title: title || '',
        html: html,
        // position: Alerts.position.bottom, // TODO Must be check if it is better to show in bottom or not
        preConfirm: () => {
          topicConcept = document.querySelector('#topicConcept').value
        },
        callback: (err) => {
          if (err) {
            window.alert('An unexpected error happened when trying to load the alert.')
          } else {
            callback(topicConcept)
          }
        }
      })
    }
    showForm()
  }

  static importCXLfile () {
    CXLImporter.askUserToImportCxlFile((err, cxlObject) => {
      if (err) {
        Alerts.errorAlert({ text: 'Unable to parse cxl file. Error:<br/>' + err.message })
      } else {
        console.log(cxlObject)
        let title
        try {
          let titleElement = cxlObject.getElementsByTagName('dc:title')[0]
          title = titleElement.innerHTML
        } catch (err) {
          title = ''
        }
        Alerts.inputTextAlert({
          alertType: Alerts.alertType.warning,
          title: 'Give a name to your concept map',
          text: 'When the configuration is imported a new highlighter is created. You can return to your other annotation codebooks using the sidebar.',
          inputPlaceholder: 'Type here the name of your concept map...',
          inputValue: title,
          preConfirm: (groupName) => {
            if (_.isString(groupName)) {
              if (groupName.length <= 0) {
                const swal = require('sweetalert2')
                swal.showValidationMessage('Name cannot be empty.')
              } else if (groupName.length > 25) {
                const swal = require('sweetalert2')
                swal.showValidationMessage('The concept map name cannot be higher than 25 characters.')
              } else {
                return groupName
              }
            }
          },
          callback: (err, groupName) => {
            if (err) {
              window.alert('Unable to load alert. Unexpected error, please contact developer.')
            } else {
              window.abwa.annotationServerManager.client.createNewGroup({ name: groupName, description: 'A group created from a cxl file' }, (err, newGroup) => {
                if (err) {
                  Alerts.errorAlert({ text: 'Unable to create a new annotation group. Error: ' + err.message })
                } else {
                  // PVSCL:IFCOND(Hypothesis,LINE)
                  // Remove public group in hypothes.is and modify group URL
                  // if (LanguageUtils.isInstanceOf(window.abwa.annotationServerManager, HypothesisClientManager)) {
                  //  if (_.has(newGroup, 'links.html')) {
                  //    newGroup.links.html = newGroup.links.html.substr(0, newGroup.links.html.lastIndexOf('/'))
                  //  }
                  // }
                  // PVSCL:ENDCOND
                  // Create codebook
                  let conceptList = cxlObject.getElementsByTagName('concept-list')[0]
                  let tempCodebook = Codebook.fromCXLFile(conceptList, groupName)
                  window.abwa.groupSelector.groups.push(newGroup)
                  Codebook.setAnnotationServer(newGroup.id, (annotationServer) => {
                    tempCodebook.annotationServer = annotationServer
                    CXLImporter.askUserRootTheme(tempCodebook.themes, (topicConceptName) => {
                      let topicThemeObject = _.filter(tempCodebook.themes, (theme) => {
                        return theme.name === topicConceptName
                      })
                      topicThemeObject[0].isTopic = true
                      let annotations = tempCodebook.toAnnotations()
                      // Send create highlighter
                      window.abwa.annotationServerManager.client.createNewAnnotations(annotations, (err, codebookAnnotations) => {
                        if (err) {
                          Alerts.errorAlert({ text: 'Unable to create new group.' })
                        } else {
                          // Parse annotations and dispatch created codebook
                          Codebook.fromAnnotations(codebookAnnotations, (err, codebook) => {
                            if (err) {
                              Alerts.errorAlert({ text: 'Unable to create a codebook. Error: ' + err.message })
                            } else {
                              let linkingAnnotations = []
                              // PVSCL:IFCOND(Linking, LINE)
                              let linkingPhraseList = cxlObject.getElementsByTagName('linking-phrase-list')[0]
                              let connectionList = cxlObject.getElementsByTagName('connection-list')[0]
                              if (linkingPhraseList) {
                                for (let i = 0; i < linkingPhraseList.childNodes.length; i++) {
                                  let linkingPhrase = linkingPhraseList.childNodes[i]
                                  let linkingPhraseName = linkingPhrase.getAttribute('label')
                                  let linkingPhraseId = linkingPhrase.getAttribute('id')
                                  let fromConcepts = _.filter(connectionList.childNodes, (connectionNode) => {
                                    return connectionNode.getAttribute('to-id') === linkingPhraseId
                                  })
                                  let toConcepts = _.filter(connectionList.childNodes, (connectionNode) => {
                                    return connectionNode.getAttribute('from-id') === linkingPhraseId
                                  })
                                  for (let j = 0; j < fromConcepts.length; j++) {
                                    let fromPreviousConceptId = fromConcepts[j].getAttribute('from-id')
                                    let fromName = this.getConceptNameFromCXL(conceptList, fromPreviousConceptId)
                                    for (let k = 0; k < toConcepts.length; k++) {
                                      let toPreviousConceptId = toConcepts[k].getAttribute('to-id')
                                      let toName = this.getConceptNameFromCXL(conceptList, toPreviousConceptId)
                                      // Tags information
                                      let tags = ['from' + ':' + fromName]
                                      tags.push('linkingWord:' + linkingPhraseName)
                                      tags.push('to:' + toName)
                                      let target = window.abwa.annotationManagement.annotationCreator.obtainTargetToCreateAnnotation({})
                                      // Body information
                                      let fromId = codebook.getThemeByName(fromName).id
                                      let toId = codebook.getThemeByName(toName).id
                                      if (fromId && toId && linkingPhraseName) {
                                        let body = []
                                        let value = {}
                                        value.from = fromId
                                        value.to = toId
                                        value.linkingWord = linkingPhraseName
                                        let linkingBody = new Linking({ value })
                                        body.push(linkingBody.serialize())
                                        let annotationToCreate = new Annotation({
                                          tags: tags,
                                          body: body,
                                          target: target,
                                          group: newGroup.id,
                                          permissions: { read: ['group:' + newGroup.id] }
                                        })
                                        linkingAnnotations.push(annotationToCreate.serialize())
                                      }
                                    }
                                  }
                                }
                              }
                              // PVSCL:ENDCOND
                              window.abwa.annotationServerManager.client.createNewAnnotations(linkingAnnotations, (err, annotations) => {
                                if (err) {
                                  Alerts.errorAlert({ text: 'Unable to import annotations. Error: ' + err.message })
                                } else {
                                  window.abwa.groupSelector.retrieveGroups(() => {
                                    window.abwa.groupSelector.setCurrentGroup(newGroup.id, () => {
                                      window.abwa.sidebar.openSidebar()
                                      // Dispatch annotations updated
                                      Alerts.closeAlert()
                                    })
                                  })
                                }
                              })
                            }
                          })
                        }
                      })
                    })
                  })
                }
              })
            }
          }
        })
      }
    })
  }

  static getConceptNameFromCXL (conceptList, id) {
    let concept = _.filter(conceptList.childNodes, (conceptNode) => {
      return conceptNode.getAttribute('id') === id
    })
    return concept[0].getAttribute('label')
  }
}

export default CXLImporter
