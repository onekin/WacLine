import _ from 'lodash'
import Config from '../../Config'
import axios from 'axios'
import $ from 'jquery'
import Alerts from '../../utils/Alerts'

class AuthorsInfo {

  /**
   * This function shows an overview of the authors information
   * selected for the current document
   */
  static async generateReview () {
    window.abwa.sidebar.closeSidebar()
    const authorsAnnotations = AuthorsInfo.getAuthorsAnnotations()
    const congress = window.abwa.annotationManagement.authorsSearch.congress

    const canvasPageURL = chrome.extension.getURL('pages/specific/authorsCanvas.html')
    axios.get(canvasPageURL).then((response) => {
      document.body.insertAdjacentHTML('beforeend', response.data)
      document.querySelector('#abwaSidebarButton').style.display = 'none'
      document.querySelector('#authorsCanvasContainer').addEventListener('click', function (e) {
        e.stopPropagation()
      })

      document.addEventListener('keydown', function (e) {
        if (e.code === 'Escape' && document.querySelector('#authorsCanvas') != null) document.querySelector('#authorsCanvas').parentNode.removeChild(document.querySelector('#authorsCanvas'))
        document.querySelector('#abwaSidebarButton').style.display = 'block'
      })
      document.querySelector('#canvasCloseButton').addEventListener('click', function () {
        document.querySelector('#authorsCanvas').parentNode.removeChild(document.querySelector('#authorsCanvas'))
        document.querySelector('#abwaSidebarButton').style.display = 'block'
      })
      document.querySelector('#authorsCanvasTitle').textContent = 'Authors overview for ' + congress.acronym + ' congress'

      const canvasContainer = document.querySelector('#authorsCanvasContainer')
      const rowTemplate = document.querySelector('#rowTemplate')
      AuthorsInfo.getAuthorsInfo(authorsAnnotations, congress).then((result) => {
        let authors = result
        for (const author of authors) {
          const rowElement = rowTemplate.content.cloneNode(true)
          rowElement.querySelector('.authorsName').textContent = author.name
          if (author.url !== '') {
            AuthorsInfo.getAuthorPublications(author, congress).then((publications) => {
              author.publications = publications
              let ending = (publications === 1) ? '' : 's'
              rowElement.querySelector('.authorsPublications').textContent = author.publications + ' publication' + ending
              let link = '<a href="' + author.url + '">' + author.url + '</a>'
              rowElement.querySelector('.authorsLink').innerHTML = link
              canvasContainer.appendChild(rowElement)
            })
          } else {
            rowElement.querySelector('.authorsPublications').textContent = 'This author could not be found'
            canvasContainer.appendChild(rowElement)
          }
        }
      })
      Alerts.closeAlert()
    })
  }

  /**
   * This function returns the annotations stored in the theme "Authors"
   * @returns [{}]
   */
  static getAuthorsAnnotations () {
    const allAnnotations = window.abwa.annotationManagement.annotationReader.allAnnotations
    const authorsAnnotations = _.filter(allAnnotations, (annotation) => {
      return _.some(annotation.tags, (tag) => {
        return tag.includes(Config.namespace + ':theme:Authors')
      })
    })
    return authorsAnnotations
  }

  /**
   * This function takes authors from the annotations and finds the name and
   * url to the DBLP by an API call
   * @param {string} authorsAnnotations
   * @param {string} congress
   * @returns {[]}
   */
  static getAuthorsInfo (authorsAnnotations, congress) {
    return new Promise((resolve) => {
      let promises = []
      const authorsNames = authorsAnnotations.map((authorAnnotation) => {
        return authorAnnotation.target[0].selector.filter((sel) => {
          return sel.exact !== undefined
        })[0].exact
      })
      let authors = []
      for (const author of authorsNames) {
        promises.push(
          $.ajax({
            url: 'http://dblp.org/search/author/api',
            data: {
              q: author,
              format: 'json',
              h: 1
            },
            success: (data) => {
              const hits = data.result.hits
              let newAuthor = {
                name: author,
                url: '',
                publications: -1
              }
              if (hits.hit) {
                newAuthor = {
                  name: hits.hit[0].info.author,
                  url: hits.hit[0].info.url
                }
              }
              authors.push(newAuthor)
            }
          })
        )
      }
      Promise.all(promises).then((promises) => {

        for (let i = 0; i < promises.length; i++) {
          let hits = promises[i].result.hits
          let newAuthor = {
            name: authorsNames[i].name,
            url: '',
            publications: -1
          }
          if (hits.hit) {
            newAuthor = {
              name: hits.hit[0].info.author,
              url: hits.hit[0].info.url
            }
          }
        }
        resolve(authors)
      })
    })
  }

  /**
   * This function returns the number of publications done by the
   * authors for the congress
   * @param {} author
   * @param {string} congress
   * @returns {[number]}
   */
  static getAuthorPublications (author, congress) {
    return new Promise((resolve) => {
      if (author.url === '') {
        resolve(-1)
      }
      let publications = 0
      $.ajax({
        url: 'http://dblp.org/search/publ/api',
        data: {
          q: author.name,
          format: 'json',
          h: 100
        },
        success: (data) => {
          const hits = data.result.hits
          for (const publication of hits.hit) {
            if (publication.info.venue.includes(congress.acronym)) {
              publications++
            }
          }
          resolve(publications)
        }
      })
    })
  }
}
export default AuthorsInfo
