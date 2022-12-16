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
import Events from '../../Events'
import { Relationship } from '../../contentScript/MapContentManager'
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

  static askUserRootTheme (themes, title, callback) {
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
      html += 'Topic:' + selectFrom.outerHTML + '<br>'
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
          CXLImporter.createNewImportedCmap(cxlObject, title)
        } else {
          console.log('The map exist:' + restoredGroup.id)
          CXLImporter.updateImportedMap(cxlObject, restoredGroup)
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

  static createNewImportedCmap (cxlObject, title) {
    let inputValue = title
    // PVSCL:IFCOND(Dimensions, LINE)
    let focusQuestionElement = cxlObject.getElementsByTagName('dc:description')[0]
    let focusQuestion = focusQuestionElement.innerHTML
    if (focusQuestionElement || focusQuestion) {
      inputValue = focusQuestion
    }
    // PVSCL:ENDCOND
    Alerts.inputTextAlert({
      alertType: Alerts.alertType.warning,
      title: 'You have imported a new concept map',
      text: 'When the configuration is imported a new highlighter is created. You can return to your other annotation codebooks using the sidebar.',
      inputPlaceholder: 'Type here the name of your new concept map...',
      inputValue: inputValue,
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
              let dimensionsListElement = cxlObject.getElementsByTagName('dc:subject')[0]
              let dimensionsList = dimensionsListElement.innerHTML.split(';')
              let tempCodebook = Codebook.fromCXLFile(conceptList, dimensionsList, groupName)
              window.abwa.groupSelector.groups.push(newGroup)
              Codebook.setAnnotationServer(newGroup.id, (annotationServer) => {
                tempCodebook.annotationServer = annotationServer
                let title = 'Which is the topic or focus question?'
                CXLImporter.askUserRootTheme(tempCodebook.themes, title, (topicConceptName) => {
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
                          if (linkingAnnotations.length !== 0) {
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

  static updateImportedMap (cxlObject, restoredGroup) {
    // IF THE IMPORTED MAP HAS AN EXISTING GROUP
    window.abwa.groupSelector.updateCurrentGroupHandler(restoredGroup.id)
    let conceptList = cxlObject.getElementsByTagName('concept-list')[0]
    let importedCodebook = Codebook.fromCXLFile(conceptList, restoredGroup)
    Codebook.setAnnotationServer(restoredGroup.id, (annotationServer) => {
      importedCodebook.annotationServer = annotationServer
      let title = 'Concept&Go has detected a version of this map. What was the topic or focus question?'
      CXLImporter.askUserRootTheme(importedCodebook.themes, title, (topicConceptName) => {
        let topicThemeObject = _.filter(importedCodebook.themes, (theme) => {
          return theme.name === topicConceptName
        })
        topicThemeObject[0].isTopic = true
        window.abwa.annotationServerManager.client.searchAnnotations({
          url: 'https://hypothes.is/groups/' + restoredGroup.id,
          order: 'desc'
        }, (err, annotations) => {
          if (err) {
            Alerts.errorAlert({ text: 'Unable to construct the highlighter. Please reload webpage and try it again.' })
          } else {
            let codebookDefinitionAnnotations = annotations.filter(annotation => annotation.motivation === 'codebookDevelopment' || 'defining')
            Codebook.fromAnnotations(codebookDefinitionAnnotations, (err, previousCodebook) => {
              let previousCodebookIDs = previousCodebook.themes.map(previousCodebookTheme => previousCodebookTheme.id)
              let previousCodebookNames = previousCodebook.themes.map(previousCodebookTheme => previousCodebookTheme.name)
              let importedCodebookIDs = importedCodebook.themes.map(importedCodebookTheme => importedCodebookTheme.id)
              let importedRelationships = []
              // construct relationships
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
                    // let fromName = this.getConceptNameFromCXL(conceptList, fromPreviousConceptId)
                    for (let k = 0; k < toConcepts.length; k++) {
                      let toPreviousConceptId = toConcepts[k].getAttribute('to-id')
                      // let toName = this.getConceptNameFromCXL(conceptList, toPreviousConceptId)
                      let from = importedCodebook.getCodeOrThemeFromId(fromPreviousConceptId)
                      let to = importedCodebook.getCodeOrThemeFromId(toPreviousConceptId)
                      let newRelation = new Relationship(linkingPhraseId, from, to, linkingPhraseName, [])
                      importedRelationships.push(newRelation)
                    }
                  }
                }
              }
              let previousRelationships = window.abwa.mapContentManager.relationships
              let previousRelationshipsIDs = previousRelationships.map(previousRelationship => previousRelationship.id)
              let importedRelationshipsIDs = importedRelationships.map(importedRelationship => importedRelationship.id)
              console.log('previousRelationships')
              console.log(previousRelationships)
              console.log('importedRelationships')
              console.log(importedRelationships)
              console.log('previousCodebook')
              console.log(previousCodebook)
              console.log('importedCodebook')
              console.log(importedCodebook)
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
                if (themesToUpdate[0]) {
                  themesToUpdate.forEach(themeToUpdate => {
                    window.abwa.codebookManager.codebookUpdater.updateCodebookTheme(themeToUpdate)
                    // Update all annotations done with this theme
                    window.abwa.codebookManager.codebookUpdater.updateAnnotationsWithTheme(themeToUpdate)
                  })
                }
              }
              // INCLUDE NEW THEMES
              let themesToInclude = importedCodebook.themes.filter(importedCodebookTheme => !(previousCodebookIDs.includes(importedCodebookTheme.id)))
              if (themesToInclude[0]) {
                themesToInclude = themesToInclude.filter(importedCodebookTheme => !(previousCodebookNames.includes(importedCodebookTheme.name)))
                console.log(themesToInclude)
                if (themesToInclude[0]) {
                  themesToInclude.forEach(themeToInclude => {
                    const newThemeAnnotation = themeToInclude.toAnnotation()
                    window.abwa.annotationServerManager.client.createNewAnnotation(newThemeAnnotation, (err, annotation) => {
                      if (err) {
                        Alerts.errorAlert({ text: 'Unable to create the new code. Error: ' + err.toString() })
                      } else {
                        LanguageUtils.dispatchCustomEvent(Events.themeCreated, { newThemeAnnotation: annotation, target: event.detail.target })
                      }
                    })
                  })
                }
              }
              // REMOVE OLD THEMES
              let themesToRemove = previousCodebook.themes.filter(previousCodebookTheme => !(importedCodebookIDs.includes(previousCodebookTheme.id)))
              console.log(themesToRemove)
              themesToRemove.forEach(themeToRemove => {
                let annotationsToDelete = [themeToRemove.id]
                window.abwa.annotationServerManager.client.deleteAnnotations(annotationsToDelete, (err, result) => {
                  if (err) {
                    Alerts.errorAlert({ text: 'Unexpected error when deleting the code.' })
                  } else {
                    LanguageUtils.dispatchCustomEvent(Events.themeRemoved, { theme: themeToRemove })
                  }
                })
              })
              // UPDATED RELATIONSHIPS
              let candidateRelationshipsToUpdate = importedRelationships.filter(importedRelationship => previousRelationshipsIDs.includes(importedRelationship.id))
              let newRelationships
              let relationshipsToUpdate = candidateRelationshipsToUpdate.filter(relationshipToUpdate => {
                let elementsToCompare = previousRelationships.filter(previousRelationship => previousRelationship.id === relationshipToUpdate.id)
                if (elementsToCompare.length > 1) {
                  console.log('problems:' + elementsToCompare)
                }
                let elementToCompare = elementsToCompare[0]
                return !(relationshipToUpdate.fromConcept.id === elementToCompare.fromConcept.id) || !(relationshipToUpdate.toConcept.id === elementToCompare.toConcept.id) || !(relationshipToUpdate.linkingWord === elementToCompare.linkingWord)
              })
              console.log(relationshipsToUpdate)
              // INCLUDE NEW RELATIONSHIPS
              let relationshipsToInclude = importedRelationships.filter(importedRelationship => !(previousRelationshipsIDs.includes(importedRelationship.id)))
              console.log(relationshipsToInclude)
              relationshipsToInclude = relationshipsToInclude.concat(relationshipsToUpdate)
              if (relationshipsToInclude[0]) {
                relationshipsToInclude.forEach(relationshipToInclude => {
                  let tags = ['from' + ':' + relationshipToInclude.fromTheme.name]
                  tags.push('linkingWord:' + relationshipToInclude.linkingWord)
                  tags.push('to:' + relationshipToInclude.toTheme.name)
                  LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
                    purpose: 'linking',
                    tags: tags,
                    from: relationshipToInclude.fromTheme.id,
                    to: relationshipToInclude.toTheme.id,
                    linkingWord: relationshipToInclude.linkingWord
                  })
                })
              }
              // REMOVE OLD RELATIONSHIPS
              let relationshipsToRemove = previousRelationships.filter(previousRelationship => !(importedRelationshipsIDs.includes(previousRelationship.id)))
              console.log(relationshipsToRemove)
              if (relationshipsToRemove[0]) {
                let annotationsToDelete = []
                relationshipsToRemove.forEach(relationship => {
                  annotationsToDelete = annotationsToDelete.concat(relationship.evidenceAnnotations)
                })
                let annotationsToDeleteIDs = annotationsToDelete.map(annotationToDelete => annotationToDelete.id)
                if (annotationsToDeleteIDs[0]) {
                  window.abwa.annotationServerManager.client.deleteAnnotations(annotationsToDeleteIDs, (err, result) => {
                    if (err) {
                      Alerts.errorAlert({ text: 'Unexpected error when deleting the code.' })
                    }
                  })
                }
              }
              Alerts.simpleSuccessAlert({ text: 'Concept map succesfully uploaded. Refresh the page!' })
            })
          }
        })
      })
    })
  }
}

export default CXLImporter
