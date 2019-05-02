const LanguageUtils = require('../utils/LanguageUtils')
const AnnotationGuide = require('./AnnotationGuide')

class GuideElement {
  constructor ({name, parentElement, childElements = [], color = 'rgba(125,125,125,1)'}) {
    this.name = name
    this.color = color
    this.parentElement = parentElement
    this.childElements = childElements
  }

  toAnnotations () {

  }

  toAnnotation () {

  }

  fromAnnotations () {

  }

  fromAnnotation () {

  }

  getAncestor () {
    let parent = this.parentElement
    while (LanguageUtils.isInstanceOf(parent, GuideElement)) {
      parent = parent.parentElement
    }
    if (LanguageUtils.isInstanceOf(parent, AnnotationGuide)) {
      return parent
    }
  }
}

module.exports = GuideElement
