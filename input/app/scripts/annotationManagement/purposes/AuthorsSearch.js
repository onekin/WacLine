import Alerts from '../../utils/Alerts'
import LanguageUtils from '../../utils/LanguageUtils'
import $ from 'jquery'
import Events from '../../Events'
import Config from '../../Config'
import _ from 'lodash'
import AuthorsInfo from '../read/AuthorsInfo'


class AuthorsSearch {
  constructor () {
    this.congress = {}
    this.events = {}
  }

  init () {
    this.loadCongress()
  }

  /**
   * This function finds the congress set to analize
   * the document in case it has been set
   */
  loadCongress (newCongress = undefined) {
    if (!newCongress) {
      const congressAnnotations = AuthorsSearch.getCongressAnnotations()
      if (congressAnnotations[0]) {
        this.congress = congressAnnotations[0].body[0].value
      }
    } else {
      this.congress = newCongress
    }
    if (_.isEmpty(this.congress)) {
      this.initCongress()
    } else {
      LanguageUtils.dispatchCustomEvent(Events.congressLoaded, {
        congress: this.congress
      })
    }
  }

  /**
   * This function shows a form to ask the user for the congress
   */
  initCongress () {
    let html = '<p>If you want to get this document\'s authors\' information introduce the name of it\'s congress</p>'
    html += '<input placeholder="Choose congress" id="swal-input1" class="swal2-input">'
    const onBeforeOpen = this.generateOnBeforeOpenForm()
    const preConfirm = this.generateCongressFormPreConfirm()
    const swalCallback = this.generateCongressFormCallback()
    Alerts.multipleInputAlert({
      title: 'Which congress owns this article?',
      html: html,
      position: Alerts.position.center,
      onBeforeOpen: onBeforeOpen,
      preConfirm: preConfirm,
      callback: swalCallback
    })
  }

  /**
   * This function adds the autocomplete to the input field of the congress
   */
  generateOnBeforeOpenForm () {
    let onBeforeOpen = () => {
      $('#swal-input1').trigger('click')
      $('#swal-input1').autocomplete({
        source: function (request, response) {
          $.ajax({
            url: 'http://dblp.org/search/venue/api',
            data: {
              q: request.term,
              format: 'json',
              h: 5
            },
            success: function (data) {
              response(data.result.hits.hit.map((e) => {
                return {
                  label: e.info.acronym + '-' + e.info.venue,
                  value: e.info.acronym + '-' + e.info.venue,
                  info: e.info
                }
              }))
            }
          })
        },
        minLength: 3,
        delay: 500,
        appendTo: '.swal2-container',
        create: function () {
          $('.ui-autocomplete').css('max-width', $('.swal2-textarea').width())
        }
      })
    }
    return onBeforeOpen
  }

  /**
   * This function splits the parts of the congress name set in the input
   * @returns {}
   */
  generateCongressFormPreConfirm () {
    const preConfirm = () => {
      let congressText = document.querySelector('#swal-input1').value
      this.congress = {}
      this.congress.acronym = congressText.slice(0, congressText.indexOf('-'))
      this.congress.name = congressText.substring(congressText.indexOf('-') + 1)
    }
    return preConfirm
  }

  /**
   * This function warns that an annotation is going to be created and that the congress has been loaded
   */
  generateCongressFormCallback () {
    const congressCallback = () => {
      const motivationTag = Config.namespace + ':' + Config.tags.motivation + ':' + 'describing'
      const tags = [motivationTag]
      LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
        purpose: 'describing',
        tags: tags,
        congress: this.congress
      })
      LanguageUtils.dispatchCustomEvent(Events.congressLoaded, {
        congress: this.congress
      })
      Alerts.successAlert({
        text: 'Congress has been successfully loaded. Anotate the authors into the \'Authors\' theme to be able to their information.'
      })
    }
    return congressCallback
  }

  static getCongressAnnotations () {
    const allAnnotations = window.abwa.annotationManagement.annotationReader.allAnnotations
    const congressAnnotations = _.filter(allAnnotations, (annotation) => {
      return _.some(annotation.tags, (tag) => {
        return tag.includes(Config.namespace + ':' + Config.tags.motivation + ':' + 'describing')
      })
    })
    return congressAnnotations
  }
}
export default AuthorsSearch
