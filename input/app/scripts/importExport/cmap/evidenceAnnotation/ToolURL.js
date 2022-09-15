import URL from './URL'
import Config from '../../../Config'

class ToolURL extends URL {
  constructor ({ elementID, name, annotation }) {
    super({ elementID, name, annotation })
    this.direction = annotation.target[0].source.url + '#' + Config.urlParamName + ':' + annotation.id
    this.content = '[InternetShortcut]\n' +
      'URL=' + this.direction
  }
}

export default ToolURL
