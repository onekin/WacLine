import Events from '../../../Events'
import _ from 'lodash'
import Alerts from '../../../utils/Alerts'
import Checklists from './Checklists'

import Config from '../../../Config'

import LanguageUtils from '../../../utils/LanguageUtils'
import Codebook from '../../model/Codebook'
import Checklist from '../../../annotationManagement/purposes/Checklist'
import ChecklistReview from '../../../annotationManagement/read/ChecklistReview'
import KeywordBasedAnnotation from '../../../annotationManagement/create/KeywordBasedAnnotation'
import axios from 'axios'
import MethodsKeywords from '../../../annotationManagement/purposes/MethodsKeywords'
import ReadCodebook from '../read/ReadCodebook'

class ImportChecklist {

  constructor () {
    this.checklistsMethods = {
      methods: []
    }
  }

  init () {
    this.setChecklistsMethodsKeywords()
  }

  /**
   * This method opens the checklist's review canvas in case there is an existing checklist for the current
   * document or opens the dialog so that the user chooses one in case there isn't
   */
  openChecklistMenu () {
    let checklist = ImportChecklist.getChecklistsAnnotations()[0]
    if (_.isEmpty(checklist)) {
      this.importChecklist()
    } else {
      ChecklistReview.generateReview()
    }
  }


  /**
   * This method ask the user to choose a checklist and imports the
   * corresponding themes and codes, it also creates the checklist annotation
   */
  importChecklist () {
    // 1- Ask user to choose checklist
    this.askUserToChooseChecklist((err, checklistGroupName, methodName) => {
      if (err) {
        Alerts.errorAlert({
          text: 'Unable to load checklist. Error:<br/>' + err.message
        })
      } else {
        // 2- Find checklist's group and method in JSON file
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
            const tempCodebook = Codebook.fromObjects(chosenMethod)

            // 4- Move to group and Add/Create themes with codes
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

            // 5- Add special annotation to track checklist (checked/not checked)
            let newBody = {
              name: chosenMethod.name,
              definition: [],
              totalCodes: 0
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
              newBody.totalCodes += newDefinition.codes.length
            })
            const motivationTag = Config.namespace + ':' + Config.tags.motivation + ':' + 'checklist'
            const tags = [motivationTag]
            LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
              purpose: Checklist.purpose,
              tags: tags,
              checklist: newBody
            })
            Alerts.successAlert({ text: 'The evaluation method has been successfully loaded' })
            Alerts.confirmAlert({
              alertType: Alerts.alertType.question,
              title: 'Keep keywords',
              text: 'Would you like to keep the keywords annotated?',
              callback: () => {
                ReadCodebook.addKeywordsTheme()
                this.saveChecklistsMethodsKeywords()
              }
            })
          }
        })
      }
    })
  }

  /**
   * This method handles the dialog to let the user choose a checklist
   * @param {*} callback
   */
  askUserToChooseChecklist (callback) {
    window.abwa.sidebar.closeSidebar()
    const canvasPageURL = chrome.extension.getURL('pages/specific/chooseChecklist.html')

    axios.get(canvasPageURL).then((response) => {
      document.body.insertAdjacentHTML('beforeend', response.data)
      document.querySelector('#abwaSidebarButton').style.display = 'none'
      document.querySelector('#chooseChecklistContainer').addEventListener('click', function (e) {
        e.stopPropagation()
      })

      document.querySelector('#chooseChecklistOverlay').addEventListener('click', function (e) {
        document.querySelector('#chooseChecklist').parentNode.removeChild(document.querySelector('#chooseChecklist'))
        document.querySelector('#abwaSidebarButton').style.display = 'block'
      })

      document.addEventListener('keydown', function (e) {
        if (e.code === 'Escape' && document.querySelector('#chooseChecklist') != null) document.querySelector('#chooseChecklist').parentNode.removeChild(document.querySelector('#chooseChecklist'))
        document.querySelector('#abwaSidebarButton').style.display = 'block'
      })

      document.querySelector('#acceptChecklistButton').addEventListener('click', function () {
        const choiceValue = document.querySelector('#checklistSelect').value
        const choiceSplited = choiceValue.split(';')
        const groupName = choiceSplited[0]
        const methodName = choiceSplited[1]
        document.querySelector('#chooseChecklist').parentNode.removeChild(document.querySelector('#chooseChecklist'))
        document.querySelector('#abwaSidebarButton').style.display = 'block'
        callback(null, groupName, methodName)
      })

      const select = document.querySelector('#checklistSelect')
      this.checklistsMethods.methods.sort((a, b) => b.keywordsMatches - a.keywordsMatches)
      this.checklistsMethods.methods.forEach((method) => {
        let option = document.createElement('option')
        option.value = method.groupName + ';' + method.name
        option.text = method.name + ' (' + method.keywordsMatches + ')'
        select.appendChild(option)
      })
    })
  }

  /**
   * Loads information corresponding to the groups and methods (including number of keywords)
   * in the checklistInfo object
   */
  setChecklistsMethodsKeywords () {
    let getMethodsKeywordsAnnotation = ImportChecklist.getMethodsKeywordsAnnotation()
    if (getMethodsKeywordsAnnotation[0]) {
      this.checklistsMethods = getMethodsKeywordsAnnotation[0].body[0].value
    }
  }

  /**
   * This method returns the annotation with the information
   * about the methods and their amount matching keywords annotation
   * @returns {Object}
   */
  static getMethodsKeywordsAnnotation () {
    const allAnnotations = window.abwa.annotationManagement.annotationReader.allAnnotations
    const methodsKeywordstAnnotations = _.filter(allAnnotations, (annotation) => {
      return _.some(annotation.tags, (tag) => {
        return tag.includes(Config.namespace + ':' + Config.tags.motivation + ':' + 'methodsKeywords')
      })
    })
    return methodsKeywordstAnnotations
  }


  /**
   * This method iterates through the checklists file and
   * saves information about the evaluation methods (name, groupname and keywords matches)
   */
  saveChecklistsMethodsKeywords () {
    const numMethods = this.getNumOfMethods()
    Checklists.groups.forEach((group) => {
      let newMethod = {
        groupName: group.name
      }
      group.methods.forEach((method) => {
        newMethod.name = method.name
        if (method.keywords) {
          this.getNumKeywordsForMethod(method, (totalMatches) => {
            newMethod.keywordsMatches = totalMatches
            this.checklistsMethods.methods.push(newMethod)
            if (this.checklistsMethods.methods.length === numMethods) {
              this.saveMethodsKeywords()
            }
          })
        } else {
          newMethod.keywordsMatches = 0
          this.checklistsMethods.methods.push(newMethod)
          if (this.checklistsMethods.methods.length === numMethods) {
            this.saveMethodsKeywords()
          }
        }
      })
    })
  }

  /**
   * This method returns the number of methods in the checklists file
   * @returns {number}
   */
  getNumOfMethods () {
    return Checklists.groups.reduce((acc, group) => {
      return acc + group.methods.length
    }, 0)
  }

  /**
   * This methods throws the event to create
   * the annotation that contains keywords information
   */
  saveMethodsKeywords () {
    const motivationTag = Config.namespace + ':' + Config.tags.motivation + ':' + 'methodsKeywords'
    const tags = [motivationTag]
    LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
      purpose: MethodsKeywords.purpose,
      tags: tags,
      methodsKeywords: this.checklistsMethods
    })
  }


  /**
   * This function returns the number of matches for the
   * keywords of the checklist method
   * @param {Object} method
   * @returns {number}
   */
  getNumKeywordsForMethod (method, callback) {
    let keywords = method.keywords
    KeywordBasedAnnotation.loadKeywords(keywords, (matches) => {
      callback(matches)
    })
  }

  /**
   * This method returns the checklists value of the current document
   * @returns {Object}
   */
  static getChecklists () {
    let checklistsAnnotations = ImportChecklist.getChecklistsAnnotations()
    return checklistsAnnotations.map((checklist) => {
      return checklist.body[0].value
    })
  }

  /**
   * This method returns the annotations corresponding to the checklist(s) of the document
   * @returns {Object}
   */
  static getChecklistsAnnotations () {
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
