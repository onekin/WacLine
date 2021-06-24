import _ from 'lodash'
import axios from 'axios'
import Commenting from '../purposes/Commenting'
import $ from 'jquery'
import Events from '../../Events'
import LanguageUtils from '../../utils/LanguageUtils'
import Alerts from '../../utils/Alerts'
import ImportChecklist from '../../codebook/operations/import/ImportChecklist'
import Canvas from './Canvas'

class ChecklistReview {

  static generateEssentialReview () {
    const checklistsAnnotations = ImportChecklist.getChecklistsAnnotations()
    const foundChecklist = checklistsAnnotations.find((checklistAn) => checklistAn.body[0].value.name === 'Essential')
    ChecklistReview.generateReview(foundChecklist)
  }

  /**
   * This function shows an overview of the current document's checklist.
   */
  static generateReview (checklistAnnotation) {
    window.abwa.sidebar.closeSidebar()

    const checklist = checklistAnnotation.body[0].value

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
      document.querySelector('#checklistCanvasTitle').textContent = checklist.name

      const canvasContainer = document.querySelector('#checklistCanvasContainer')
      const clusterTemplate = document.querySelector('#checklistClusterTemplate')
      const itemTemplate = document.querySelector('#codeTemplate')
      checklist.definition.forEach((type) => {
        const cluster = clusterTemplate.content.cloneNode(true)
        cluster.querySelector('.checklistClusterLabel span').innerText = type.name
        const height = type.codes.length / checklist.totalCodes * 70 + 10
        cluster.querySelector('.checklistPropertyCluster').style.height = height + '%'

        const codebook = window.abwa.codebookManager.codebookReader.codebook
        const theme = codebook.getThemeByName(checklistAnnotation.body[0].value.name)

        type.codes.forEach((code) => {
          let themeCode = theme.getCodeByName(code.name)
          let annotations = window.abwa.annotatedContentManager.getAnnotationsDoneWithThemeOrCodeId(themeCode.id)

          const item = itemTemplate.content.cloneNode(true)
          if (code.status === 'undefined' && annotations.length > 0) {
            item.querySelector('.checkLiItem').classList.add('annotated')
          } else {
            item.querySelector('.checkLiItem').classList.add(code.status)
          }
          item.querySelector('.checkLiItem').setAttribute('id', code.name)
          item.querySelector('.checkLiItem span').innerText = code.name
          item.querySelector('.checkLiItem').addEventListener('click', function () {
            document.querySelector('#checklistCanvas').style.display = 'none'
            ChecklistReview.generateItemReview(checklistAnnotation, type, code)
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
  static generateItemReview (checklistAnnotation, type, chosenCode) {
    const itemPageURL = chrome.extension.getURL('pages/specific/checklistItem.html')
    let newStatus = chosenCode.status
    axios.get(itemPageURL).then((response) => {
      document.body.insertAdjacentHTML('beforeend', response.data)
      document.querySelector('#abwaSidebarButton').style.display = 'none'
      document.querySelector('#checklistItemContainer').addEventListener('click', function (e) {
        e.stopPropagation()
      })

      let codebook = window.abwa.codebookManager.codebookReader.codebook
      let annotations
      if (!_.isEmpty(codebook)) {
        let theme = codebook.getThemeByName(checklistAnnotation.body[0].value.name)
        if (theme) {
          let code = theme.getCodeByName(chosenCode.name)
          annotations = window.abwa.annotatedContentManager.getAnnotationsDoneWithThemeOrCodeId(code.id)
        }
      }


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
        ChecklistReview.changeItemBackground(chosenCode, annotations ? annotations.length : 0)

        document.querySelector('#checklistItem').parentNode.removeChild(document.querySelector('#checklistItem'))
        document.querySelector('#checklistCanvas').style.display = 'block'
      })
      document.querySelector('#checklistItemTitle').textContent = chosenCode.name + ':'
      document.querySelector('#checklistItemDescription').textContent = chosenCode.description

      if (chosenCode.status === 'passed') {
        $('.like').addClass('active')
      } else if (chosenCode.status === 'failed') {
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
        ChecklistReview.changeItemStatus(checklistAnnotation, type, chosenCode, newStatus)
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
  static changeItemStatus (checklistAnnotation, type, chosenCode, newStatus) {
    checklistAnnotation.body[0].value.definition.forEach((definition) => {
      if (definition.name === type.name) {
        definition.codes.forEach((code) => {
          if (code.name === chosenCode.name) {
            code.status = newStatus
          }
        })
      }
    })
    LanguageUtils.dispatchCustomEvent(Events.updateAnnotation, {
      annotation: checklistAnnotation
    })
  }

  /**
   * This function updates the background-color of the chosen code to it's state by changing it's class
   * @param {Object} chosenCode
   */
  static changeItemBackground (chosenCode, numAnnotations) {
    document.getElementById(chosenCode.name).classList.remove('passed', 'failed', 'undefined', 'annotated')
    if (chosenCode.status === 'undefined' && numAnnotations > 0) {
      document.getElementById(chosenCode.name).classList.add('annotated')
    } else {
      document.getElementById(chosenCode.name).classList.add(chosenCode.status)
    }
  }
}
export default ChecklistReview
