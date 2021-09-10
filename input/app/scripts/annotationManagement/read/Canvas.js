import Alerts from '../../utils/Alerts'
import axios from 'axios'
// PVSCL:IFCOND(ImportChecklist, LINE)
import ChecklistReview from './ChecklistReview'
// PVSCL:ENDCOND
import { Review } from '../../exporter/reviewModel'

class Canvas {
  static generateCanvas () {
    window.abwa.sidebar.closeSidebar()
    let review = null
    // PVSCL:IFCOND(Filter, LINE)
    review = Review.parseAnnotations(window.abwa.annotationManagement.annotationReader.currentAnnotations)
    // PVSCL:ELSECOND
    review = Review.parseAnnotations(window.abwa.annotationManagement.annotationReader.allAnnotations)
    // PVSCL:ENDCOND
    const canvasPageURL = chrome.extension.getURL('pages/specific/reviewCanvas.html')
    axios.get(canvasPageURL).then((response) => {
      document.body.insertAdjacentHTML('beforeend', response.data)
      document.querySelector('#abwaSidebarButton').style.display = 'none'

      const canvasContainer = document.querySelector('#canvasContainer')
      document.querySelector('#canvasOverlay').addEventListener('click', function () {
        document.querySelector('#reviewCanvas').parentNode.removeChild(document.querySelector('#reviewCanvas'))
        document.querySelector('#abwaSidebarButton').style.display = 'block'
      })
      document.querySelector('#canvasContainer').addEventListener('click', function (e) {
        e.stopPropagation()
      })
      document.addEventListener('keydown', function (e) {
        if (e.code === 'Escape' && document.querySelector('#reviewCanvas') != null) document.querySelector('#reviewCanvas').parentNode.removeChild(document.querySelector('#reviewCanvas'))
        document.querySelector('#abwaSidebarButton').style.display = 'block'
      })
      document.querySelector('#canvasCloseButton').addEventListener('click', function () {
        document.querySelector('#reviewCanvas').parentNode.removeChild(document.querySelector('#reviewCanvas'))
        document.querySelector('#abwaSidebarButton').style.display = 'block'
      })
      const canvasClusters = {}
      // PVSCL:IFCOND(ImportChecklist, LINE)
      const checklistNames = ['Essential', 'Desirable', 'Extraordinary']
      const checklistsTheme = {
        name: 'Checklists',
        codes: checklistNames
      }
      // PVSCL:ENDCOND

      window.abwa.codebookManager.codebookReader.codebook.themes.forEach((theme) => {
        let themeShouldBeAdded = true
        // PVSCL:IFCOND(KeywordBasedAnnotation, LINE)
        themeShouldBeAdded = theme.name !== 'Keywords'
        // PVSCL:ENDCOND
        // PVSCL:IFCOND(AuthorsSearch, LINE)
        themeShouldBeAdded = themeShouldBeAdded ? theme.name !== 'Authors' : themeShouldBeAdded // If any previous condition set themeShouldBeAdded to false, keeps false
        // PVSCL:ENDCOND
        // PVSCL:IFCOND(ImportChecklist, LINE)
        themeShouldBeAdded = themeShouldBeAdded ? !checklistNames.includes(theme.name) : themeShouldBeAdded // If any previous condition set themeShouldBeAdded to false, keeps false
        // PVSCL:ENDCOND
        if (themeShouldBeAdded) {
          canvasClusters[theme.name] = theme.codes.map((code) => { return code.name })
          canvasClusters[theme.name].push(theme.name)
        }
      })

      // PVSCL:IFCOND(ImportChecklist, LINE)
      canvasClusters[checklistsTheme.name] = checklistsTheme.codes
      // PVSCL:ENDCOND

      const clusterTemplate = document.querySelector('#propertyClusterTemplate')
      const columnTemplate = document.querySelector('#clusterColumnTemplate')
      const propertyTemplate = document.querySelector('#clusterPropertyTemplate')
      const annotationTemplate = document.querySelector('#annotationTemplate')
      // let clusterHeight = 100.0/Object.keys(canvasClusters).length

      const getCriterionLevel = (annotations) => {
        if (annotations.length === 0) return 'emptyCluster'
        if (annotations[0].level == null || annotations[0].level === '') return 'unsorted'
        const criterionLevel = annotations[0].level
        for (let i = 1; i < annotations.length; i++) {
          if (annotations[i].level == null || annotations[i].level === '') return 'unsorted'
          else if (annotations[i].level !== criterionLevel) return 'unsorted'
        }
        return criterionLevel.replace(/\s/g, '')
      }

      const displayAnnotation = (annotation) => {
        let swalContent = ''
        if (annotation.highlightText != null && annotation.highlightText !== '') {
          swalContent += '<h2 style="text-align:left;margin-bottom:10px;">Highlight</h2><div style="text-align:justify;font-style:italic">"' + annotation.highlightText.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '"</div>'
        }
        if (annotation.comment != null && annotation.comment !== '') {
          swalContent += '<h2 style="text-align:left;margin-top:10px;margin-bottom:10px;">Comment</h2><div style="text-align:justify;">' + annotation.comment.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>'
        }
        // PVSCL:IFCOND(SuggestedLiterature, LINE)
        if (annotation.suggestedLiterature != null && annotation.suggestedLiterature.length > 0) {
          swalContent += '<h2 style="text-align:left;margin-top:10px;margin-bottom:10px;">Suggested literature</h2><div style="text-align:justify;"><ul style="padding-left:10px;">' + annotation.suggestedLiterature.map((e) => { return '<li>' + e.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</li>' }).join('') + '</ul></div>'
        }
        // PVSCL:ENDCOND
        const swal = require('sweetalert2').default
        swal.fire({
          html: swalContent,
          confirmButtonText: 'View in context'
        }).then((result) => {
          if (result.value) {
            document.querySelector('#reviewCanvas').parentNode.removeChild(document.querySelector('#reviewCanvas'))
            window.abwa.annotationManagement.goToAnnotation(window.abwa.annotationManagement.annotationReader.allAnnotations.find((e) => { return e.id === annotation.id }))
            document.querySelector('#abwaSidebarButton').style.display = 'block'
          }
        })
      }

      const getGroupAnnotationCount = (group) => {
        let i = 0
        canvasClusters[group].forEach((e) => { i += review.annotations.filter((a) => { return a.criterion === e }).length })
        return i
      }
      const getColumnAnnotationCount = (properties) => {
        let i = 0
        properties.forEach((e) => { i += review.annotations.filter((a) => { return a.criterion === e }).length })
        return i
      }
      const getGroupHeight = (group) => {
        if (review.annotations.filter((e) => { return e.criterion !== 'Typos' }).length === 0) return 33.3333
        return 15.0 + getGroupAnnotationCount(group) * (100.0 - 15 * Object.keys(canvasClusters).length) / review.annotations.filter((e) => { return e.criterion !== 'Typos' }).length
      }
      const getColumnWidth = (properties, group) => {
        const colNum = canvasClusters[group].length === 2 ? 2 : Math.ceil(canvasClusters[group].length / 2)
        if (getGroupAnnotationCount(group) === 0) return 100.0 / Math.ceil(canvasClusters[group].length / 2)
        return 15.0 + getColumnAnnotationCount(properties) * (100.0 - 15 * colNum) / getGroupAnnotationCount(group)
      }
      const getPropertyHeight = (property, properties) => {
        if (properties.length === 1) return 100
        if (getColumnAnnotationCount(properties) === 0 && properties.length === 2) return 50
        return 15.0 + review.annotations.filter((e) => { return e.criterion === property }).length * (100.0 - 15 * 2) / getColumnAnnotationCount(properties)
      }

      for (const key in canvasClusters) {
        const clusterElement = clusterTemplate.content.cloneNode(true)
        // clusterElement.querySelector(".propertyCluster").style.height = clusterHeight+'%'
        clusterElement.querySelector('.propertyCluster').style.height = getGroupHeight(key) + '%'
        clusterElement.querySelector('.clusterLabel span').innerText = key
        const clusterContainer = clusterElement.querySelector('.clusterContainer')
        let currentColumn = null
        for (let i = 0; i < canvasClusters[key].length; i++) {
          if (i % 2 === 0 || canvasClusters[key].length === 2) {
            currentColumn = columnTemplate.content.cloneNode(true)
            if (canvasClusters[key].length === 1) currentColumn.querySelector('.clusterColumn').style.width = '100%'
            /* else if(canvasClusters[key].length==2) currentColumn.querySelector('.clusterColumn').style.width = "50%"
            else currentColumn.querySelector('.clusterColumn').style.width = parseFloat(100.0/Math.ceil(canvasClusters[key].length/2)).toString()+'%' */
            else {
              let columnWidth
              if (canvasClusters[key].length === 2) {
                columnWidth = getColumnWidth([canvasClusters[key][i]], key)
                if (getColumnAnnotationCount(canvasClusters[key]) === 0) {
                  currentColumn.querySelector('.clusterColumn').style.height = 50 + '%'
                }
              } else if (i < canvasClusters[key].length - 1) columnWidth = getColumnWidth([canvasClusters[key][i], canvasClusters[key][i + 1]], key)
              else columnWidth = getColumnWidth([canvasClusters[key][i]], key)
              currentColumn.querySelector('.clusterColumn').style.width = columnWidth + '%'
            }
          }
          const clusterProperty = propertyTemplate.content.cloneNode(true)
          clusterProperty.querySelector('.propertyLabel').innerText = canvasClusters[key][i]
          let propertyHeight = 100
          if (canvasClusters[key].length === 2) propertyHeight = getPropertyHeight(canvasClusters[key][i], [canvasClusters[key][i]])
          else if (i % 2 === 0 && i < canvasClusters[key].length - 1) propertyHeight = getPropertyHeight(canvasClusters[key][i], [canvasClusters[key][i], canvasClusters[key][i + 1]])
          else if (i % 2 === 1) propertyHeight = getPropertyHeight(canvasClusters[key][i], [canvasClusters[key][i], canvasClusters[key][i - 1]])
          clusterProperty.querySelector('.clusterProperty').style.height = propertyHeight + '%'
          clusterProperty.querySelector('.clusterProperty').style.width = '100%'
          let criterionAnnotations = review.annotations.filter((e) => { return e.criterion === canvasClusters[key][i] })
          // PVSCL:IFCOND(ImportChecklist, LINE)
          if (checklistNames.includes(canvasClusters[key][i])) {
            criterionAnnotations = []
            clusterProperty.querySelector('.clusterProperty').style.cursor = 'pointer'
            clusterProperty.querySelector('.clusterProperty').addEventListener('click', () => {
              const themeAnnotation = window.abwa.codebookManager.codebookReader.codebook.getThemeByName(canvasClusters[key][i])
              document.querySelector('#reviewCanvas').style.display = 'none'
              ChecklistReview.generateReview(themeAnnotation)
            })
          }
          // PVSCL:ENDCOND
          if (criterionAnnotations.length === 0) clusterProperty.querySelector('.propertyAnnotations').style.display = 'none'
          clusterProperty.querySelector('.clusterProperty').className += ' ' + getCriterionLevel(criterionAnnotations)

          const annotationWidth = 100.0 / criterionAnnotations.length
          for (let j = 0; j < criterionAnnotations.length; j++) {
            const annotationElement = annotationTemplate.content.cloneNode(true)
            annotationElement.querySelector('.canvasAnnotation').style.width = annotationWidth + '%'
            if (criterionAnnotations[j].highlightText != null) annotationElement.querySelector('.canvasAnnotation').innerText = '"' + criterionAnnotations[j].highlightText + '"'
            if (criterionAnnotations[j].level != null) annotationElement.querySelector('.canvasAnnotation').className += ' ' + criterionAnnotations[j].level.replace(/\s/g, '')
            else annotationElement.querySelector('.canvasAnnotation').className += ' unsorted'
            annotationElement.querySelector('.canvasAnnotation').addEventListener('click', function () {
              displayAnnotation(criterionAnnotations[j])
            })
            clusterProperty.querySelector('.propertyAnnotations').appendChild(annotationElement)
          }

          currentColumn.querySelector('.clusterColumn').appendChild(clusterProperty)
          if (i % 2 === 1 || i === canvasClusters[key].length - 1 || canvasClusters[key].length === 2) clusterContainer.appendChild(currentColumn)
        }
        canvasContainer.appendChild(clusterElement)
      }
      Alerts.closeAlert()
    })
  }
}

export default Canvas
