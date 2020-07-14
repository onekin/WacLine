import Events from '../../Events'
import axios from 'axios'
import _ from 'lodash'

class FinalGrade {
  constructor () {
    this.events = {}
    this.page = chrome.extension.getURL('pages/sidebar/finalGrade.html')
  }

  init () {
    this.initUpdatedGradeEvent()
    this.renderFinalGrade()
  }

  initUpdatedGradeEvent () {
    this.events.updatedGradeEvent = { element: document, event: Events.updatedGrade, handler: this.createUpdatedGradeEventHandler() }
    this.events.updatedGradeEvent.element.addEventListener(this.events.updatedGradeEvent.event, this.events.updatedGradeEvent.handler, false)
  }

  createUpdatedGradeEventHandler () {
    return (event) => {
      this.gradeContainer.innerHTML = event.detail.codebook.grade
    }
  }

  renderFinalGrade (callback) {
    axios.get(this.page).then((response) => {
      this.sidebar = document.querySelector('#abwaSidebarContainer')
      this.groupContainer = this.sidebar.querySelector('#groupSelectorContainer')
      this.groupContainer.insertAdjacentHTML('afterend', response.data)
      this.gradeContainer = document.querySelector('#finalGrade')
    })
  }
}

export default FinalGrade
