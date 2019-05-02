class AnnotationGuide {
  constructor ({name, hypothesisGroup, guideElements = []}) {
    this.name = name.substr(0, 25)
    this.hypothesisGroup = hypothesisGroup
    this.guideElements = guideElements
  }

  toAnnotations () {

  }

  toAnnotation () {

  }

  fromAnnotation (annotation) {

  }

  fromAnnotations (annotations) {

  }
}

module.exports = AnnotationGuide
