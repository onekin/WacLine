import Body from './Body'
// PVSCL:IFCOND(Hierarchy, LINE)
import Code from '../../codebook/model/Code'
// PVSCL:ENDCOND
import Theme from '../../codebook/model/Theme'
import LanguageUtils from '../../utils/LanguageUtils'
import _ from 'lodash'

class Classifying extends Body {
  constructor ({ purpose = Classifying.purpose, code }) {
    super(purpose)
    if (!_.isEmpty(code)) {
      if (/* PVSCL:IFCOND(Hierarchy) */LanguageUtils.isInstanceOf(code, Code) || /* PVSCL:ENDCOND */LanguageUtils.isInstanceOf(code, Theme)) {
        this.value = code.toObject()
      } else {
        this.value = code
      }
    } else {
      throw new Error('Body with classifying purpose must contain a code or theme')
    }
  }

  populate (code) {
    super.populate(code)
  }

  serialize () {
    return super.serialize()
  }

  static deserialize (obj) {
    const code = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(obj.id)
    return new Classifying({ code })
  }

  tooltip () {
    let tooltip = ''
    const code = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(this.value.id)
    // PVSCL:IFCOND(Hierarchy, LINE)
    if (LanguageUtils.isInstanceOf(code, Code)) {
      tooltip += 'Code ' + code.name + ' for theme ' + code.theme.name
    } else {
      if (code) {
        tooltip += 'Theme: ' + code.name
      } else {
        if (_.has(this.value, 'theme')) {
          tooltip += 'Deleted or modified code ' + this.value.name + ' for theme ' + this.value.theme.name
        } else {
          tooltip += 'Deleted theme ' + this.value.name
        }
      }
    }
    // PVSCL:ELSECOND
    if (code) {
      tooltip += 'Theme: ' + code.name
    } else {
      tooltip += 'Deleted theme: ' + this.value.name
    }
    // PVSCL:ENDCOND
    return tooltip
  }
}

Classifying.purpose = 'classifying'

export default Classifying
