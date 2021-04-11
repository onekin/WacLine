import Alerts from '../../utils/Alerts'
import LanguageUtils from '../../utils/LanguageUtils'
import $ from 'jquery'
import Events from '../../Events'
import Config from '../../Config'
import _ from 'lodash'
require('components-jqueryui')


class AuthorsSearch {
  constructor () {
    this.congress = {}
    this.events = {}
  }

  init (callback) {
    this.loadCongress()
  }

  loadCongress () {
    const allAnnotations = window.abwa.annotationManagement.annotationReader.allAnnotations
    const congressAnnotations = _.filter(allAnnotations, (annotation) => {
      return _.some(annotation.tags, (tag) => {
        return tag.includes(Config.namespace + ':' + Config.tags.motivation + ':' + 'describing')
      })
    })
    if (congressAnnotations[0]) {
      this.congress = congressAnnotations[0].body[0].value
    }
    if (_.isEmpty(this.congress)) {
      this.initCongress()
    } else {
      LanguageUtils.dispatchCustomEvent(Events.congressLoaded, {
        congress: this.congress
      })
    }
  }

  initCongress (callback) {
    let html = '<p>Enter the name of the congress you want to get authors information from</p>'
    html += '<input placeholder="Choose congress" id="swal-input1" class="swal2-input">'
    const onBeforeOpen = this.generateOnBeforeOpenForm()
    const preConfirm = this.generateCongressFormPreConfirm()
    const swalCallback = this.generateCongressFormCallback()
    Alerts.multipleInputAlert({
      title: 'Do you want to get authors information?',
      html: html,
      position: Alerts.position.bottom,
      onBeforeOpen: onBeforeOpen,
      preConfirm: preConfirm,
      callback: swalCallback
    })
  }

  generateOnBeforeOpenForm () {
    let onBeforeOpen = () => {
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

  generateCongressFormPreConfirm () {
    const preConfirm = () => {
      let congressText = document.querySelector('#swal-input1').value
      this.congress = {}
      this.congress.acronym = congressText.slice(0, congressText.indexOf('-'))
      this.congress.name = congressText.substring(congressText.indexOf('-') + 1)
    }
    return preConfirm
  }

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
    }
    return congressCallback
  }
}
export default AuthorsSearch
