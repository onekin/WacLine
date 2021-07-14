import _ from 'lodash'
import axios from 'axios'
import Alerts from '../../utils/Alerts'
import Commenting from '../purposes/Commenting'
import $ from 'jquery'
import Events from '../../Events'
import LanguageUtils from '../../utils/LanguageUtils'
import ImportChecklist from '../../codebook/operations/import/ImportChecklist'
import Config from '../../Config'
import Canvas from './Canvas'
import ChecklistValidation from '../purposes/ChecklistValidation'

class ChecklistReview {

  static generateEssentialReview () {
    const essentialTheme = window.abwa.codebookManager.codebookReader.codebook.getThemeByName('Essential')
    ChecklistReview.generateReview(essentialTheme)
  }

  /**
   * This function shows an overview of the current document's checklist.
   */
  static generateReview (theme) {
    window.abwa.sidebar.closeSidebar()
    const criteriaValidationAnnotation = ChecklistReview.getChecklistsvalidationAnnotation()
    const validationCriteria = criteriaValidationAnnotation.body[0].value.criteria
    const checklistsAnnotation = ImportChecklist.getChecklistsAnnotation()
    const importedChecklists = checklistsAnnotation.body[0].value.definition
    const usedMethods = []
    const criteria = theme.codes.map(c => {
      return {
        id: c.id,
        name: c.name,
        description: c.description
      }
    })
    let totalCodes = 0
    importedChecklists.forEach((method) => {
      const intersectionCodes = criteria.filter(criteria => method.codes.includes(criteria.id))
      totalCodes += intersectionCodes.length
      if (intersectionCodes.length > 0) {
        const newUsedMethod = {
          name: method.name,
          codes: intersectionCodes
        }
        usedMethods.push(newUsedMethod)
      }
    })


    const canvasPageURL = chrome.extension.getURL('pages/specific/checklistCanvas.html')

    axios.get(canvasPageURL).then((response) => {
      document.body.insertAdjacentHTML('beforeend', response.data)
      document.querySelector('#abwaSidebarButton').style.display = 'none'
      document.querySelector('#checklistCanvasContainer').addEventListener('click', function (e) {
        e.stopPropagation()
      })

      document.querySelector('#checklistCanvasOverlay').addEventListener('click', function (e) {
        document.querySelector('#checklistCanvas').parentNode.removeChild(document.querySelector('#checklistCanvas'))
        if (document.querySelector('#reviewCanvas')) document.querySelector('#reviewCanvas').parentNode.removeChild(document.querySelector('#reviewCanvas'))
        document.querySelector('#abwaSidebarButton').style.display = 'block'
      })
      document.querySelector('#backToCanvasArrow').addEventListener('click', function (e) {
        document.querySelector('#checklistCanvas').parentNode.removeChild(document.querySelector('#checklistCanvas'))
        if (document.querySelector('#reviewCanvas')) {
          document.querySelector('#reviewCanvas').style.display = 'block'
        } else {
          Canvas.generateCanvas()
        }
      })

      document.addEventListener('keydown', function (e) {
        if (e.code === 'Escape' && document.querySelector('#checklistCanvas') != null) document.querySelector('#checklistCanvas').parentNode.removeChild(document.querySelector('#checklistCanvas'))
        document.querySelector('#abwaSidebarButton').style.display = 'block'
      })
      document.querySelector('#checklistCanvasTitle').textContent = theme.name

      const canvasContainer = document.querySelector('#checklistCanvasContainer')
      const clusterTemplate = document.querySelector('#checklistClusterTemplate')
      const itemTemplate = document.querySelector('#codeTemplate')

      usedMethods.forEach((method) => {
        const cluster = clusterTemplate.content.cloneNode(true)
        cluster.querySelector('.checklistClusterLabel span').innerText = method.name
        const height = method.codes.length / totalCodes * 70 + 10
        cluster.querySelector('.checklistPropertyCluster').style.height = height + '%'


        method.codes.forEach((code) => {
          const item = itemTemplate.content.cloneNode(true)
          const criterionIndex = validationCriteria.findIndex(criterion => criterion.codeId === code.id)
          let annotations = window.abwa.annotatedContentManager.getAnnotationsDoneWithThemeOrCodeId(code.id)
          if (criterionIndex > -1) {
            item.querySelector('.checkLiItem').classList.add(validationCriteria[criterionIndex].status)
          } else if (annotations.length > 0) {
            item.querySelector('.checkLiItem').classList.add('annotated')
          } else {
            item.querySelector('.checkLiItem').classList.add('undefined')
          }
          item.querySelector('.checkLiItem').setAttribute('id', code.name)
          item.querySelector('.checkLiItem span').innerText = code.name
          item.querySelector('.checkLiItem').addEventListener('click', function () {
            document.querySelector('#checklistCanvas').style.display = 'none'
            ChecklistReview.generateItemReview(code)
          })
          cluster.querySelector('.checklistClusterContainer').appendChild(item)
        })

        canvasContainer.appendChild(cluster)
      })

      Alerts.closeAlert()
    })
  }

  /**
   * This function shows an overview of an item of the checklist with the annotations
   * and the posibility to 'pass', 'fail' or 'undefine' the item.
   */
  static generateItemReview (code) {
    const itemPageURL = chrome.extension.getURL('pages/specific/checklistItem.html')
    const criteriaValidationAnnotation = ChecklistReview.getChecklistsvalidationAnnotation()
    const validationCriteria = criteriaValidationAnnotation.body[0].value.criteria
    const validationOfCriterion = validationCriteria.find((criterion) => criterion.codeId === code.id)
    let newStatus = validationOfCriterion ? validationOfCriterion.status : 'undefined'
    axios.get(itemPageURL).then((response) => {
      document.body.insertAdjacentHTML('beforeend', response.data)
      document.querySelector('#abwaSidebarButton').style.display = 'none'
      document.querySelector('#checklistItemContainer').addEventListener('click', function (e) {
        e.stopPropagation()
      })
      const annotations = window.abwa.annotatedContentManager.getAnnotationsDoneWithThemeOrCodeId(code.id)


      const removeCanvasReviewFunction = function () {
        document.querySelector('#reviewCanvas').parentNode.removeChild(document.querySelector('#reviewCanvas'))
        document.querySelector('#checklistCanvas').parentNode.removeChild(document.querySelector('#checklistCanvas'))
        document.querySelector('#checklistItem').parentNode.removeChild(document.querySelector('#checklistItem'))
        document.querySelector('#backToItemReviewArrowContainer').parentNode.removeChild(document.querySelector('#backToItemReviewArrowContainer'))
        document.querySelector('#abwaSidebarButton').style.display = 'block'
      }


      document.addEventListener('keydown', function (e) {
        if (e.code === 'Escape' && document.querySelector('#checklistItem') != null) document.querySelector('#checklistItem').parentNode.removeChild(document.querySelector('#checklistItem'))
      })

      document.querySelector('#checklistItemOverlay').addEventListener('click', removeCanvasReviewFunction)

      document.querySelector('#backToChecklistReviewArrow').addEventListener('click', function () {
        ChecklistReview.changeItemBackground(code, annotations ? annotations.length : 0, newStatus)

        document.querySelector('#checklistItem').parentNode.removeChild(document.querySelector('#checklistItem'))
        document.querySelector('#checklistCanvas').style.display = 'block'
      })
      document.querySelector('#checklistItemTitle').textContent = code.name + ':'
      document.querySelector('#checklistItemDescription').textContent = code.description

      if (newStatus === 'passed') {
        $('.like').addClass('active')
      } else if (newStatus === 'failed') {
        $('.dislike').addClass('active')
      }

      $('.like, .dislike').on('click', function () {
        if (this.classList.contains('active')) {
          $('.active').removeClass('active')
          newStatus = 'undefined'
        } else {
          $('.active').removeClass('active')
          $(this).addClass('active')
          if (this.classList.contains('like')) {
            newStatus = 'passed'
          } else {
            newStatus = 'failed'
          }
        }
        ChecklistReview.changeItemStatus(code.id, newStatus)
      })

      if (annotations) {
        const itemAnnotationsContainer = document.querySelector('#itemAnnotationsContainer')
        const annotationCardTemplate = document.querySelector('#annotationCardTemplate')
        annotations.forEach((annotation) => {
          const annotationCard = annotationCardTemplate.content.cloneNode(true)
          annotationCard.querySelector('.annotationCardContent').addEventListener('click', function () {
            document.querySelector('#checklistCanvas').style.display = 'none'
            document.querySelector('#checklistItem').style.display = 'none'
            document.querySelector('#backToItemReviewArrowContainer').style.display = 'block'
            document.addEventListener('dblclick', removeCanvasReviewFunction)

            document.querySelector('#backToItemReviewArrowContainer').addEventListener('click', function () {
              document.querySelector('#checklistItem').style.display = 'block'
              document.querySelector('#backToItemReviewArrowContainer').style.display = 'none'
              document.removeEventListener('dblclick', removeCanvasReviewFunction)
            })
            window.abwa.annotationManagement.goToAnnotation(annotation)
          })
          annotationCard.querySelector('.annotationCardContent span').innerText = '"' + annotation.target[0].selector[2].exact + '"'
          let commentBody = annotation.getBodyForPurpose(Commenting.purpose)
          if (commentBody) {
            annotationCard.querySelector('.annotationCardContent ul li').innerText = commentBody.value
          } else {
            annotationCard.querySelector('.annotationCardContent').removeChild(annotationCard.querySelector('.annotationCardContent ul'))
          }
          itemAnnotationsContainer.appendChild(annotationCard)
        })
      }
    })
  }

  /**
   * This function takes the type/category of the item/chosenCode and
   * updates it to the new status on the checklist
   * @param {Object} checklistAnnotation
   * @param {*} type
   * @param {*} chosenCode
   * @param {*} newStatus
   */
  static changeItemStatus (changeCodeId, newStatus) {
    const validationAnnotation = ChecklistReview.getChecklistsvalidationAnnotation()
    const validationCriteria = validationAnnotation.body[0].value.criteria
    const tupleIndex = validationCriteria.findIndex(codeTuple => codeTuple.codeId === changeCodeId)
    if (tupleIndex > -1) {
      validationCriteria[tupleIndex].status = newStatus
    } else {
      validationCriteria.push({
        codeId: changeCodeId,
        status: newStatus
      })
    }
    LanguageUtils.dispatchCustomEvent(Events.updateAnnotation, {
      annotation: validationAnnotation
    })
  }

  /**
   * This function updates the background-color of the chosen code to it's state by changing it's class
   * @param {Object} chosenCode
   */
  static changeItemBackground (chosenCode, numAnnotations, status) {
    document.getElementById(chosenCode.name).classList.remove('passed', 'failed', 'undefined', 'annotated')
    if (chosenCode.status === 'undefined' && numAnnotations > 0) {
      document.getElementById(chosenCode.name).classList.add('annotated')
    } else {
      document.getElementById(chosenCode.name).classList.add(status)
    }
  }


  static createValidateCriteriaAnnotation () {
    const motivationTag = Config.namespace + ':' + Config.tags.motivation + ':' + ChecklistValidation.purpose
    const tags = [motivationTag]
    const criteria = {
      criteria: []
    }
    LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
      purpose: ChecklistValidation.purpose,
      tags: tags,
      criteria: criteria
    })
  }


  /**
   * This method returns the annotation for criteria validation
   * @returns {Object}
   */
  static getChecklistsvalidationAnnotation () {
    const allAnnotations = window.abwa.annotationManagement.annotationReader.allAnnotations
    const checklistAnnotation = _.filter(allAnnotations, (annotation) => {
      return _.some(annotation.tags, (tag) => {
        return tag.includes(Config.namespace + ':' + Config.tags.motivation + ':' + ChecklistValidation.purpose)
      })
    })
    return checklistAnnotation[0]
  }

}
export default ChecklistReview
