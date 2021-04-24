import Events from '../../../Events'
import _ from 'lodash'
import Alerts from '../../../utils/Alerts'
import Checklists from './Checklists'

import Config from '../../../Config'

import LanguageUtils from '../../../utils/LanguageUtils'
import Codebook from '../../model/Codebook'
import Checklist from '../../../annotationManagement/purposes/Checklist'

class ImportChecklist {

  static import () {
    // 1- Ask user to choose checklist
    ImportChecklist.askUserToChoose((err, checklistGroupName, methodName) => {
      if (err) {
        Alerts.errorAlert({
          text: 'Unable to load checklist. Error:<br/>' + err.message
        })
      } else {
        // 2- Find group and method in JSON file
        let group = Checklists.groups.filter((group) => {
          return group.name === checklistGroupName
        })[0]
        let chosenMethod = group.methods.filter((method) => {
          return method.name === methodName
        })[0]

        // 3- Create new group
        window.abwa.annotationServerManager.client.createNewGroup({
          name: checklistGroupName,
          description: 'A group created using annotation tool ' + chrome.runtime.getManifest().name
        }, (err, newGroup) => {
          if (err) {
            console.log(err)
          } else {
            // 4- Move to group (edit loading keywords and authors and new empty codebook)
            const tempCodebook = Codebook.fromObjects(chosenMethod)

            // 5- Add/Create themes with codes
            window.abwa.groupSelector.retrieveGroups(() => {
              window.abwa.groupSelector.setCurrentGroup(newGroup.id, () => {
                Codebook.setAnnotationServer(newGroup.id, (annotationServer) => {
                  tempCodebook.annotationServer = annotationServer
                  const annotations = tempCodebook.toAnnotations()
                  window.abwa.annotationServerManager.client.createNewAnnotations(annotations, (err, codebookAnnotations) => {
                    if (err) {
                      Alerts.errorAlert({
                        text: 'An error has occurred loading the evaluation method checklist. Error: ' + err.message
                      })
                    }
                  })
                })
              })
            })

            // 6- Add special annotation to track checklist (checked/not checked)
            let newBody = {
              name: chosenMethod.name,
              definition: []
            }
            chosenMethod.definition.forEach((category) => {
              let newDefinition = {
                name: category.name,
                description: category.description,
                codes: []
              }
              newDefinition.codes = category.codes.map((code) => {
                return {
                  name: code.name,
                  description: code.description,
                  status: 'undefined'
                }
              })
              newBody.definition.push(newDefinition)
            })
            const motivationTag = Config.namespace + ':' + Config.tags.motivation + ':' + 'checklist'
            const tags = [motivationTag]
            LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
              purpose: Checklist.purpose,
              tags: tags,
              checklist: newBody
            })
          }
        })
      }
    })
  }

  static askUserToChoose (callback) {
    let checklistGroup = 'Empirical Standart'
    let checklistName = 'General Standart'
    callback(null, checklistGroup, checklistName)
  }

  static openChecklistMenu () {
    let checklist = ImportChecklist.getChecklists()[0]
    if (_.isEmpty(checklist)) {
      ImportChecklist.import()
    } else {
      console.log(checklist)
    }
  }
  
  static getChecklists () {
    const allAnnotations = window.abwa.annotationManagement.annotationReader.allAnnotations
    const checklistAnnotations = _.filter(allAnnotations, (annotation) => {
      return _.some(annotation.tags, (tag) => {
        return tag.includes(Config.namespace + ':' + Config.tags.motivation + ':' + 'checklist')
      })
    })
    return checklistAnnotations
  }



}
export default ImportChecklist
