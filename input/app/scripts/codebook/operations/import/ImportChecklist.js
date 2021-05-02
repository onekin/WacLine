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
// PVSCL:IFCOND(KeywordBasedAnnotation, LINE)
import MethodsKeywords from '../../../annotationManagement/purposes/MethodsKeywords'
// PVSCL:ENDCOND
import ReadCodebook from '../read/ReadCodebook'
import AuthorsSearch from '../../../annotationManagement/purposes/AuthorsSearch'

class ImportChecklist {

  constructor () {
    this.checklistsMethods = {
      methods: []
    }
  }

  init () {
    // PVSCL:IFCOND(KeywordBasedAnnotation, LINE)
    this.setChecklistsMethodsKeywords()
    // PVSCL:ENDCOND
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
        // Get authors annotations
        // PVSCL:IFCOND(AuthorsSearch, LINE)
        const authorsTheme = window.abwa.codebookManager.codebookReader.codebook.getThemeByName('Authors')
        const congressAnnotation = AuthorsSearch.getCongressAnnotations()[0]
        let authorsAnnotations = []
        if (authorsTheme && congressAnnotation) {
          authorsAnnotations = window.abwa.annotatedContentManager.getAnnotationsDoneWithThemeOrCodeId(authorsTheme.id)
        }
        // PVSCL:ENDCOND

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
                    } else {
                    }
                  })
                  Alerts.closeAlert()
                  // PVSCL:IFCOND(AuthorsSearch, LINE)
                  // Load authors Annotations (create AuthorsTheme and change group id permission and theme id)
                  if (authorsTheme && congressAnnotation) {
                    this.askToKeepAuthors(newGroup.id, congressAnnotation, authorsAnnotations)
                  }
                  // PVSCL:ENDCOND

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
            // PVSCL:IFCOND(KeywordBasedAnnotation AND NOT AuthorsSearch, LINE)
            // this.askToKeepKeywords()
            // PVSCL:ENDCOND
          }
        })
      }
    })
  }

  // PVSCL:IFCOND(AuthorsSearch, LINE)
  askToKeepAuthors (newGroupId, congressAnnotation, authorsAnnotations) {
    Alerts.confirmAlert({
      alertType: Alerts.alertType.question,
      title: 'Keep Authors Info',
      text: 'Would you like to Authors information? (Including annotations)',
      callback: () => {
        this.transferAuthors(newGroupId, congressAnnotation, authorsAnnotations, () => {
          // PVSCL:IFCOND(KeywordBasedAnnotation, LINE)
          this.askToKeepKeywords()
          // PVSCL:ENDCOND
        })
      }
    })
  }

  transferAuthors (newGroupId, congressAnnotation, authorsAnnotations, callback) {
    if (_.isEmpty(window.abwa.codebookManager.codebookReader.codebook)) {
      setTimeout(() => {
        this.transferAuthors(newGroupId, congressAnnotation, authorsAnnotations, callback)
      }, 500)
    } else {
      ReadCodebook.addAuthorsTheme()
      const codebook = window.abwa.codebookManager.codebookReader.codebook
      const newAuthorsTheme = codebook.getThemeByName('Authors')
      if (newAuthorsTheme) {
        authorsAnnotations.push(congressAnnotation)
        authorsAnnotations.forEach((annotation) => {
          const classifyingBody = annotation.body.find(body => body.purpose === 'classifying')
          if (classifyingBody) {
            annotation.body[annotation.body.findIndex(body => body.purpose === 'classifying')].value = newAuthorsTheme.toObject()
          }
          annotation.group = newGroupId
          annotation.permissions = { read: ['group:' + newGroupId] }
        })
        const congress = congressAnnotation.body[0].value
        window.abwa.annotationManagement.authorsSearch.loadCongress(congress)
        window.abwa.annotationServerManager.client.createNewAnnotations(authorsAnnotations, (err, annotations) => {
          if (err) {
            console.log(err)
          }
          console.log(authorsAnnotations)
        })
      }
      if (_.isFunction(callback)) {
        callback()
      }
    }
  }

  // PVSCL:ENDCOND


  // PVSCL:IFCOND(KeywordBasedAnnotation, LINE)
  askToKeepKeywords () {
    Alerts.confirmAlert({
      alertType: Alerts.alertType.question,
      title: 'Keep keywords',
      text: 'Would you like to keep the keywords annotated?',
      callback: () => {
        ReadCodebook.addKeywordsTheme()
        this.saveChecklistsMethodsData()
      }
    })
  }
  // PVSCL:ENDCOND

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
      // PVSCL:IFCOND(KeywordBasedAnnotation, LINE)
      this.checklistsMethods.methods.sort((a, b) => b.keywordsMatches - a.keywordsMatches)
      // PVSCL:ENDCOND
      this.checklistsMethods.methods.forEach((method) => {
        let option = document.createElement('option')
        option.value = method.groupName + ';' + method.name
        option.text = method.name
        // PVSCL:IFCOND(KeywordBasedAnnotation, LINE)
        option.text += ' (' + method.keywordsMatches + ')'
        // PVSCL:ENDCOND
        select.appendChild(option)
      })
    })
  }

  // PVSCL:IFCOND(KeywordBasedAnnotation, LINE)
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

  // PVSCL:ENDCOND

  /**
   * This method iterates through the checklists file and
   * saves information about the evaluation methods (name, groupname and keywords matches if(option is set))
   */
  saveChecklistsMethodsData () {
    const numMethods = this.getNumOfMethods()
    Checklists.groups.forEach((group) => {
      let newMethod = {
        groupName: group.name
      }
      group.methods.forEach((method) => {
        newMethod.name = method.name
        // PVSCL:IFCOND(KeywordBasedAnnotation, LINE)
        if (method.keywords) {
          this.getNumKeywordsForMethod(method, (totalMatches) => {
            newMethod.keywordsMatches = totalMatches
            this.checklistsMethods.methods.push(newMethod)
            if (this.checklistsMethods.methods.length === numMethods) {
              this.saveMethodsData()
            }
          })
        } else {
        // PVSCL:ENDCOND
          newMethod.keywordsMatches = 0
          this.checklistsMethods.methods.push(newMethod)
          if (this.checklistsMethods.methods.length === numMethods) {
            this.saveMethodsData()
          }
        // PVSCL:IFCOND(KeywordBasedAnnotation, LINE)
        }
        // PVSCL:ENDCOND

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

  // PVSCL:IFCOND(KeywordBasedAnnotation, LINE)
  /**
   * This methods throws the event to create
   * the annotation that contains keywords information
   */
  saveMethodsData () {
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

  // PVSCL:ENDCOND

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
