import Alerts from '../../utils/Alerts'
import FileUtils from '../../utils/FileUtils'
import LanguageUtils from '../../utils/LanguageUtils'
import Linking from '../../annotationManagement/purposes/linking/Linking'
import Annotation from '../../annotationManagement/Annotation'
import Codebook from '../../codebook/model/Codebook'
import _ from 'lodash'
// PVSCL:IFCOND(Hypothesis,LINE)
import HypothesisClientManager from '../../annotationServer/hypothesis/HypothesisClientManager'
import Config from '../../Config'
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
        let title, groupID
        try {
          let titleElement = cxlObject.getElementsByTagName('dc:title')[0]
          title = titleElement.innerHTML
          let groupIDElement = cxlObject.getElementsByTagName('dc:description')[0]
          groupID = groupIDElement.innerHTML
        } catch (err) {
          title = ''
          groupID = ''
        }
        let restoredGroup = window.abwa.groupSelector.groups.filter(existingGroups => existingGroups.id === groupID)[0]
        // IF THE IMPORTED MAP DOES NOT EXIST
        if (!restoredGroup) {
          Alerts.inputTextAlert({
            alertType: Alerts.alertType.warning,
            title: 'Give a name to your new concept map',
            text: 'When the configuration is imported a new highlighter is created. You can return to your other annotation codebooks using the sidebar.',
            inputPlaceholder: 'Type here the name of your new concept map...',
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
        } else {
          // IF THE IMPORTED MAP HAS AN EXISTING GROUP
          console.log('the map exist:' + groupID)
          // window.abwa.groupSelector.setCurrentGroup(groupID)
          let conceptList = cxlObject.getElementsByTagName('concept-list')[0]
          let importedCodebook = Codebook.fromCXLFile(conceptList, restoredGroup)
          Codebook.setAnnotationServer(restoredGroup.id, (annotationServer) => {
            importedCodebook.annotationServer = annotationServer
            CXLImporter.askUserRootTheme(importedCodebook.themes, (topicConceptName) => {
              let topicThemeObject = _.filter(importedCodebook.themes, (theme) => {
                return theme.name === topicConceptName
              })
              topicThemeObject[0].isTopic = true
              window.abwa.annotationServerManager.client.searchAnnotations({
                url: 'https://hypothes.is/groups/' + groupID,
                order: 'desc'
              }, (err, annotations) => {
                if (err) {
                  Alerts.errorAlert({ text: 'Unable to construct the highlighter. Please reload webpage and try it again.' })
                } else {
                  let codebookDefinitionAnnotations = annotations.filter(annotation => annotation.motivation === 'codebookDevelopment' || 'defining')
                  console.log(codebookDefinitionAnnotations)
                  Codebook.fromAnnotations(codebookDefinitionAnnotations, (err, previousCodebook) => {
                    let previousCodebookIDs = previousCodebook.themes.map(previousCodebookTheme => previousCodebookTheme.id)
                    let importedCodebookIDs = importedCodebook.themes.map(importedCodebookTheme => importedCodebookTheme.id)
                    if (err) {
                      Alerts.errorAlert({ text: 'Error parsing codebook. Error: ' + err.message })
                    } else {
                      // UPDATED THEMES
                      let candidateThemesToUpdate = importedCodebook.themes.filter(importedCodebookTheme => previousCodebookIDs.includes(importedCodebookTheme.id))
                      let themesToUpdate = candidateThemesToUpdate.filter(themeToUpdate => {
                        let elementToCompare = previousCodebook.themes.filter(previousCodebookTheme => previousCodebookTheme.id === themeToUpdate.id)
                        return !(themeToUpdate.name === elementToCompare[0].name)
                      })
                      console.log(themesToUpdate)
                      /*if (themesToUpdate[0]) {
                        themesToUpdate.forEach(themeToUpdate => {
                          window.abwa.codebookManager.codebookUpdater.updateCodebookTheme(themeToUpdate)
                          // Update all annotations done with this theme
                          window.abwa.codebookManager.codebookUpdater.updateAnnotationsWithTheme(themeToUpdate)
                        })
                      }*/
                    }
                    // INCLUDE NEW THEMES
                    let themesToInclude = importedCodebook.themes.filter(importedCodebookTheme => !(previousCodebookIDs.includes(importedCodebookTheme.id)))
                    console.log(themesToInclude)
                    // REMOVE OLD THEMES
                    let themesToRemove = previousCodebook.themes.filter(previousCodebookTheme => !(importedCodebookIDs.includes(previousCodebookTheme.id)))
                    console.log(themesToRemove)
                  })
                }
              })
              /* window.abwa.annotationServerManager.client.createNewAnnotations(annotations, (err, codebookAnnotations) => {
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
                                  group: restoredGroup.id,
                                  permissions: { read: ['group:' + restoredGroup.id] }
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
                            window.abwa.groupSelector.setCurrentGroup(restoredGroup.id, () => {
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
              })*/
            })
          })
        }
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
