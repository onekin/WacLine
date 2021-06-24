import Events from '../../../Events'
import _ from 'lodash'
import Alerts from '../../../utils/Alerts'
import Checklists from './Checklists'

import Config from '../../../Config'

import LanguageUtils from '../../../utils/LanguageUtils'
import Checklist from '../../../annotationManagement/purposes/Checklist'
import KeywordBasedAnnotation from '../../../annotationManagement/create/KeywordBasedAnnotation'
import axios from 'axios'
// PVSCL:IFCOND(KeywordBasedAnnotation, LINE)
import MethodsKeywords from '../../../annotationManagement/purposes/MethodsKeywords'
import ReadCodebook from '../read/ReadCodebook'
// PVSCL:ENDCOND

class ImportChecklist {

  constructor () {
    this.checklistsMethods = {
      methods: []
    }
    this.events = {}
  }

  init (callback) {
    ReadCodebook.addChecklistsThemes()
    // PVSCL:IFCOND(KeywordBasedAnnotation, LINE)
    this.setChecklistsMethodsKeywords()
    // PVSCL:ENDCOND
    if (_.isFunction(callback)) {
      callback()
    }
  }

  // PVSCL:IFCOND(KeywordBasedAnnotation, LINE)
  initKeywordsLoadedEvent () {
    this.events.keywordsLoadedEvent = {
      element: document,
      event: Events.keywordsLoaded,
      handler: this.importChecklist()
    }
    this.events.keywordsLoadedEvent.element.addEventListener(this.events.keywordsLoadedEvent.event, this.events.keywordsLoadedEvent.handler, false)
  }
  // PVSCL:ENDCOND


  /**
   * This method ask the user to choose a checklist and imports the
   * corresponding themes and codes, it also creates the checklist annotation
   */
  importChecklist (filter) {
    // 1- Ask user to choose checklist
    this.askUserToChooseChecklist(filter, (err, checklistGroupName, methodName) => {
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

        this.askUserToChooseCriteria(chosenMethod, (toAddCriteria) => {
          let method = {
            name: chosenMethod.name,
            definition: []
          }
          let methodTheme = {
            name: method.name,
            description: '',
            codes: []
          }
          let essentialTheme = window.abwa.codebookManager.codebookReader.codebook.getThemeByName('Essential')
          let desirableTheme = window.abwa.codebookManager.codebookReader.codebook.getThemeByName('Desirable')
          let extraordinaryTheme = window.abwa.codebookManager.codebookReader.codebook.getThemeByName('Extraordinary')
          let essentials = toAddCriteria.essential
          let desirables = toAddCriteria.desirable
          let extraordinaries = toAddCriteria.extraordinary

          let i = 0
          for (let essential of essentials) {
            if (essentialTheme.getCodeByName(essential.name)) {
              essentials.splice(i, 1)
            }
            i++
          }

          i = 0
          for (let desirable of desirables) {
            if (desirableTheme.getCodeByName(desirable.name)) {
              desirables.splice(i, 1)
            }
            i++
          }

          i = 0
          for (let extraordinary of extraordinaries) {
            if (extraordinaryTheme.getCodeByName(extraordinary.name)) {
              extraordinaries.splice(i, 1)
            }
            i++
          }

          // Adds all the criteria to the corresponding theme
          LanguageUtils.dispatchCustomEvent(Events.createCodes, {
            theme: essentialTheme,
            codesInfo: essentials
          })
          LanguageUtils.dispatchCustomEvent(Events.createCodes, {
            theme: desirableTheme,
            codesInfo: desirables
          })
          LanguageUtils.dispatchCustomEvent(Events.createCodes, {
            theme: extraordinaryTheme,
            codesInfo: extraordinaries
          })

          // 5- Add special annotation to track invalid criticisms and that checklist has been added
          let checklistWithInvalidCrit = {
            name: chosenMethod.name,
            invalidCriticisms: []
          }
          if (chosenMethod.invalidCriticisms) {
            checklistWithInvalidCrit.invalidCriticisms = chosenMethod.invalidCriticisms
          }
          let newEssentialDefinition = {
            name: chosenMethod.name,
            description: '',
            codes: essentials.map((criterion) => {
              return {
                name: criterion.name,
                description: criterion.description,
                status: 'undefined'
              }
            })
          }

          let newDesirableDefinition = {
            name: chosenMethod.name,
            description: '',
            codes: desirables.map((criterion) => {
              return {
                name: criterion.name,
                description: criterion.description,
                status: 'undefined'
              }
            })
          }

          let newExtraordinaryDefinition = {
            name: chosenMethod.name,
            description: '',
            codes: extraordinaries.map((criterion) => {
              return {
                name: criterion.name,
                description: criterion.description,
                status: 'undefined'
              }
            })
          }

          // Update essential, desirable and extraordinary checklist annotations
          const essentialChecklist = ImportChecklist.getChecklistsAnnotations().find((checklistAnnotation) => checklistAnnotation.body[0].value.name === 'Essential')
          if (essentials.length > 0) {
            essentialChecklist.body[0].value.totalCodes += essentials.length
            essentialChecklist.body[0].value.definition.push(newEssentialDefinition)
          }
          essentialChecklist.body[0].value.chosenChecklists.push(checklistWithInvalidCrit)
          LanguageUtils.dispatchCustomEvent(Events.updateAnnotation, {
            annotation: essentialChecklist
          })

          const desirableChecklist = ImportChecklist.getChecklistsAnnotations().find((checklistAnnotation) => checklistAnnotation.body[0].value.name === 'Desirable')
          if (desirables.length > 0) {
            desirableChecklist.body[0].value.totalCodes += desirables.length
            desirableChecklist.body[0].value.definition.push(newDesirableDefinition)
          }
          desirableChecklist.body[0].value.chosenChecklists.push(checklistWithInvalidCrit)
          LanguageUtils.dispatchCustomEvent(Events.updateAnnotation, {
            annotation: desirableChecklist
          })

          const extraordinaryChecklist = ImportChecklist.getChecklistsAnnotations().find((checklistAnnotation) => checklistAnnotation.body[0].value.name === 'Extraordinary')
          if (extraordinaries.length > 0) {
            extraordinaryChecklist.body[0].value.totalCodes += extraordinaries.length
            extraordinaryChecklist.body[0].value.definition.push(newExtraordinaryDefinition)
          }
          extraordinaryChecklist.body[0].value.chosenChecklists.push(checklistWithInvalidCrit)
          LanguageUtils.dispatchCustomEvent(Events.updateAnnotation, {
            annotation: extraordinaryChecklist
          })

          // Create annotation to keep chosen checklists and invalid criticisms

          Alerts.successAlert({
            text: 'Checklist has been imported successfully'
          })
        })
      }
    })
  }

  static createChecklistAnnotation (name) {
    let newBody = {
      name: name,
      definition: [],
      totalCodes: 0,
      chosenChecklists: []
    }
    const motivationTag = Config.namespace + ':' + Config.tags.motivation + ':' + 'checklist'
    const tags = [motivationTag]
    LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
      purpose: Checklist.purpose,
      tags: tags,
      checklist: newBody
    })
  }

  /**
   * This method handles the dialog to let the user choose a checklist
   * @param {*} callback
   */
  askUserToChooseChecklist (filter, callback) {
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
        callback(null, groupName, methodName)
      })
      document.querySelector('#cancelChecklistButton').addEventListener('click', function () {
        document.querySelector('#chooseChecklist').parentNode.removeChild(document.querySelector('#chooseChecklist'))
        document.querySelector('#abwaSidebarButton').style.display = 'block'
      })

      if (filter) {
        document.querySelector('#chooseChecklistContainer h1').innerText = 'Choose ' + filter + ' method'
      } else {
        document.querySelector('#chooseChecklistContainer h1').innerText = 'Choose criteria list'
      }

      const select = document.querySelector('#checklistSelect')
      let filteredMethods = [...this.checklistsMethods.methods]
      let i = -1
      const alreadyChosenChecklists = checklistAnnotations[0].body[0].value.chosenChecklists
      for (let method of this.checklistsMethods.methods) {
        i++
        if (filter && method.filter ? !method.filter.includes(filter) : true) {
          filteredMethods.splice(i, 1)
          i--
        } else {
          for (let checklist of alreadyChosenChecklists) {
            if (method.name === checklist.name) {
              filteredMethods.splice(i, 1)
              i--
              break
            }
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


  askUserToChooseCriteria (method, callback) {
    window.abwa.sidebar.closeSidebar()
    const canvasPageURL = chrome.extension.getURL('pages/specific/chooseCriteria.html')
    axios.get(canvasPageURL).then((response) => {
      document.body.insertAdjacentHTML('beforeend', response.data)
      document.querySelector('#abwaSidebarButton').style.display = 'none'

      document.addEventListener('keydown', function (e) {
        if (e.code === 'Escape' && document.querySelector('#chooseCriteria') != null) {
          document.querySelector('#chooseCriteria').parentNode.removeChild(document.querySelector('#chooseCriteria'))
          document.querySelector('#abwaSidebarButton').style.display = 'block'
        }
      })

      document.querySelector('#cancelCriteriaButton').addEventListener('click', function (e) {
        document.querySelector('#chooseCriteria').parentNode.removeChild(document.querySelector('#chooseCriteria'))
        document.querySelector('#abwaSidebarButton').style.display = 'block'
      })

      document.querySelector('#chooseChecklistOverlay').addEventListener('click', function (e) {
        document.querySelector('#chooseCriteria').parentNode.removeChild(document.querySelector('#chooseCriteria'))
        document.querySelector('#abwaSidebarButton').style.display = 'block'
      })

      document.querySelector('#acceptCriteriaButton').addEventListener('click', function (e) {
        // Get for each category the selected criteria and return them with callback
        const clusters = document.querySelectorAll('.categoryCluster')
        let chosenCriteria = {
          essential: [],
          desirable: [],
          extraordinary: []
        }
        clusters.forEach((cluster) => {
          const type = cluster.querySelector('.categoryTitle').innerText.toLowerCase()
          cluster.querySelectorAll('.selected').forEach((selCriterion) => {
            const criterionName = selCriterion.querySelector('span').innerText
            chosenCriteria[type].push(criterionName)
          })
        })

        let toAddCriteria = {
          essential: [],
          desirable: [],
          extraordinary: []
        }

        method.definition.forEach((category) => {
          category.codes.forEach((criterion) => {
            if (chosenCriteria[category.name.toLowerCase()].includes(criterion.name)) {
              toAddCriteria[category.name.toLowerCase()].push(criterion)
            }
          })
        })
        document.querySelector('#chooseCriteria').parentNode.removeChild(document.querySelector('#chooseCriteria'))
        callback(toAddCriteria)
      })



      document.querySelector('#chooseCriteriaContainer').addEventListener('click', function (e) {
        e.stopPropagation()
      })
      const clusterContainer = document.querySelector('#definitionClusterContainer')
      const categoryTemplate = document.querySelector('#definitionCategoryTemplate')
      const totalCodes = method.definition.reduce((numCodes, category) => {
        return numCodes + category.codes.length
      }, 0)
      method.definition.forEach((category) => {
        const categoryCluster = categoryTemplate.content.cloneNode(true)
        categoryCluster.querySelector('.categoryTitle').innerText = category.name
        const height = category.codes.length / totalCodes * 70
        categoryCluster.querySelector('.categoryCluster').style.height = height + '%'
        const categoryCriteriaContainer = categoryCluster.querySelector('.criteria')
        const criterionCardTemplate = document.querySelector('#criterionCardTemplate')
        category.codes.forEach((criterion) => {
          const categoryCard = criterionCardTemplate.content.cloneNode(true)
          categoryCard.querySelector('.criterionCardContent span').innerText = criterion.name
          categoryCard.querySelector('.criterion').addEventListener('click', function (e) {
            if (e.currentTarget.classList.contains('selected')) {
              e.currentTarget.classList.remove('selected')
            } else {
              e.currentTarget.classList.add('selected')
            }
          })

          categoryCriteriaContainer.appendChild(categoryCard)
        })
        clusterContainer.appendChild(categoryCluster)
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
          groupName: group.name,
          name: method.name,
          filter: method.filter
        }
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
