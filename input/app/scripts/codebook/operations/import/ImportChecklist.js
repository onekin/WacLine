import Events from '../../../Events'
import _ from 'lodash'
import Alerts from '../../../utils/Alerts'
import Checklists from './Checklists'

import Config from '../../../Config'

import LanguageUtils from '../../../utils/LanguageUtils'
import Codebook from '../../model/Codebook'
import Checklist from '../../../annotationManagement/purposes/Checklist'
import KeywordBasedAnnotation from '../../../annotationManagement/create/KeywordBasedAnnotation'
import axios from 'axios'
// PVSCL:IFCOND(KeywordBasedAnnotation, LINE)
import MethodsKeywords from '../../../annotationManagement/purposes/MethodsKeywords'
// PVSCL:ENDCOND
import ReadCodebook from '../read/ReadCodebook'

class ImportChecklist {

  constructor () {
    this.checklistsMethods = {
      methods: []
    }
    this.events = {}
  }

  init () {
    // PVSCL:IFCOND(KeywordBasedAnnotation, LINE)
    this.setChecklistsMethodsKeywords()
    // PVSCL:ENDCOND
  }

  // PVSCL:IFCOND(KeywordBasedAnnotation, LINE)
  initKeywordsLoadedEvent () {
    this.events.keywordsLoadedEvent = {
      element: document,
      event: Events.keywordsLoaded,
      handler: this.keywordsLoadedEventHandler()
    }
    this.events.keywordsLoadedEvent.element.addEventListener(this.events.keywordsLoadedEvent.event, this.events.keywordsLoadedEvent.handler, false)
  }

  keywordsLoadedEventHandler () {
    this.openChecklistMenu()
  }
  // PVSCL:ENDCOND


  /**
   * This method opens the checklist's review canvas in case there is an existing checklist for the current
   * document or opens the dialog so that the user chooses one in case there isn't
   */
  openChecklistMenu () {
    this.importChecklist()
  }

  /**
   * This method ask the user to choose a checklist and imports the
   * corresponding themes and codes, it also creates the checklist annotation
   */
  importChecklist () {
    // 1- Ask user to choose checklist
    this.askUserToChooseChecklist((err, checklistGroupName, methodName) => {
      this.addCoodebookLoadedEvent()
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
        console.log(chosenMethod)
        let method = {
          name: chosenMethod.name,
          definition: []
        }
        let methodTheme = {
          name: method.name,
          description: '',
          codes: []
        }
        chosenMethod.definition.forEach((definition) => {
          methodTheme.codes = methodTheme.codes.concat(definition.codes)
        })
        method.definition.push(methodTheme)

        const tempCodebook = Codebook.fromObjects(method)

        // 4- Create themes with codes
        tempCodebook.annotationServer = window.abwa.codebookManager.codebookReader.codebook.annotationServer
        const annotations = tempCodebook.toAnnotations()
        window.abwa.annotationServerManager.client.createNewAnnotations(annotations, (err, codebookAnnotations) => {
          if (err) {
            Alerts.errorAlert({
              text: 'An error has occurred loading the evaluation method checklist. Error: ' + err.message
            })
          } else {
            window.abwa.codebookManager.codebookReader.init()
            Alerts.closeAlert()
          }
        })

        // 5- Add special annotation to track checklist (checked/not checked)
        let newBody = {
          name: chosenMethod.name,
          definition: [],
          totalCodes: 0,
          invalidCriticisms: []
        }
        if (chosenMethod.invalidCriticisms) {
          newBody.invalidCriticisms = chosenMethod.invalidCriticisms
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
        window.abwa.annotatedContentManager.reloadTagsChosen()
        Alerts.successAlert({
          text: 'Method has been imported successfully'
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
    const checklistAnnotations = ImportChecklist.getChecklistsAnnotations()
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
      document.querySelector('#cancelChecklistButton').addEventListener('click', function () {
        document.querySelector('#chooseChecklist').parentNode.removeChild(document.querySelector('#chooseChecklist'))
        document.querySelector('#abwaSidebarButton').style.display = 'block'
      })

      const select = document.querySelector('#checklistSelect')
      let filteredMethods = this.checklistsMethods.methods
      let i = -1
      for (var method of this.checklistsMethods.methods) {
        i++
        for (var checklist of checklistAnnotations) {
          if (method.name === checklist.body[0].value.name) {
            filteredMethods.splice(i, 1)
            break
          }
        }
      }
      // PVSCL:IFCOND(KeywordBasedAnnotation, LINE)
      filteredMethods.sort((a, b) => b.keywordsMatches - a.keywordsMatches)
      // PVSCL:ENDCOND
      filteredMethods.forEach((method) => {
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
    let methodsDataAnnotations = ImportChecklist.getMethodsDataAnnotations()
    if (methodsDataAnnotations[0]) {
      this.checklistsMethods = methodsDataAnnotations[0].body[0].value
    }
  }

  /**
   * This method returns the annotation with the information
   * about the methods and their amount matching keywords annotation
   * @returns {Object}
   */
  static getMethodsDataAnnotations () {
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
      group.methods.forEach((method) => {
        let newMethod = {
          groupName: group.name
        }
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
    LanguageUtils.dispatchCustomEvent(Events.keywordsLoaded)
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
