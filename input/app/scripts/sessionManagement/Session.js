
import Config from '../Config'
import _ from 'lodash'

class Session {
  constructor ({
    id = null,
    sessionName = '',
    sessionURIs = [],
    group = null,
    updated = null
  }) {
    this.id = id
    this.sessionName = sessionName
    this.sessionURIs = sessionURIs
    this.group = group
    this.updated = updated
  }

  toAnnotation () {
    const sessionTag = Config.namespace + ':session:' + this.group
    const tags = [sessionTag, Config.namespace + ':isSession']
    // Construct text attribute of the annotation
    return {
      name: this.sessionName,
      group: this.group,
      permissions: {
        read: ['group:' + this.group]
      },
      references: [],
      // IFCOND:(Hypothesis, LINE)
      uri: window.abwa.groupSelector.currentGroup.links.html,
      // ENDCOND
      motivation: 'defining',
      tags: tags,
      target: [],
      sessionURIs: this.sessionURIs || []
    }
  }

  static deserialize (annotation) {
    const sessionOptions = { id: annotation.id, sessionName: annotation.name, sessionURIs: annotation.sessionURIs, group: annotation.group, updated: annotation.updated }
    let session
    session = new Session(sessionOptions)
    console.log(session)
    return session
  }

}
export default Session

