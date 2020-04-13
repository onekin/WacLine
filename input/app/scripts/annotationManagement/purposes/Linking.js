import AnnotationUtils from '../../utils/AnnotationUtils'
import Config from '../../Config'
import _ from 'lodash'

class Linking {

  static hasLinks (annotation, allAnnotations) {
    try {
      return Linking.getLinks(annotation, allAnnotations).lenght > 0
    } catch (e) {
      return false
    }
  }


  static getLinks (annotation, allAnnotations) {
    let links = _.filter(allAnnotations, (linkingAnnotation) => {
      return AnnotationUtils.isLinkOf(annotation, linkingAnnotation)
    })
    links = _.orderBy(links, 'update')
    return links
  }
}
