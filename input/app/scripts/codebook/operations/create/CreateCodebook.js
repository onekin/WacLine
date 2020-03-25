import Events from '../../../Events'
import _ from 'lodash'
// PVSCL:IFCOND(BuiltIn, LINE)
import BuiltIn from './builtIn/BuiltIn'
import EmptyCodebook from './emptyCodebook/EmptyCodebook'
// PVSCL:ENDCOND
// PVSCL:IFCOND(NOT(Classifying), LINE)
import NoCodebook from './noCodebook/NoCodebook'
// PVSCL:ENDCOND
import Codebook from '../../model/Codebook'
import LanguageUtils from '../../../utils/LanguageUtils'
import Alerts from '../../../utils/Alerts'

class CreateCodebook {
  constructor () {
    this.events = {}
  }

  /**
   * Initializes codebook creator funcionality
   */
  init () {
    // Add event listener for createCodebook event
    this.initCreateCodebookEvent()
  }

  destroy () {
    // Remove event listeners
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }

  /**
   * Initializes codebook create event listener
   */
  initCreateCodebookEvent () {
    this.events.createCodebook = { element: document, event: Events.createCodebook, handler: this.createCodebookEventHandler() }
    this.events.createCodebook.element.addEventListener(this.events.createCodebook.event, this.events.createCodebook.handler, false)
  }

  createCodebookEventHandler () {
    return (event) => {
      const promise = new Promise((resolve, reject) => {
        const howCreate = event.detail.howCreate
        // PVSCL:IFCOND(BuiltIn, LINE)
        if (howCreate === 'builtIn') {
          BuiltIn.createDefaultAnnotations((err, annotations) => {
            if (err) {
              reject(err)
            } else {
              resolve(annotations)
            }
          })
        }
        if (howCreate === 'emptyCodebook') {
          EmptyCodebook.createDefaultAnnotations((err, annotations) => {
            if (err) {
              reject(err)
            } else {
              resolve(annotations)
            }
          })
        }
        // PVSCL:ELSEIFCOND(NOT(Codebook), LINE)
        if (howCreate === 'noCodebook') {
          NoCodebook.createDefaultAnnotations((err, annotations) => {
            if (err) {
              reject(err)
            } else {
              resolve(annotations)
            }
          })
        }
        // PVSCL:ENDCOND
      })
      promise.catch((err) => {
        Alerts.errorAlert({ text: err })
      }).then((annotations) => {
        Codebook.fromAnnotations(annotations, (err, codebook) => {
          if (err) {
            Alerts.errorAlert({ text: 'Unable to create a codebook. Error: ' + err.message })
          } else {
            LanguageUtils.dispatchCustomEvent(Events.codebookCreated, { codebook: codebook })
          }
        })
      })
    }
  }
}

export default CreateCodebook
