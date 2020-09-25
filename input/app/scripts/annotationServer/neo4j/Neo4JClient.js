/* eslint-disable */
import _ from 'lodash'
import axios from 'axios'
// const jsonld = require('jsonld')

// Configuration constants
const now = new Date()
var contextus = []
var contextualization = [ 'http://www.w3.org/ns/anno.jsonld', {"assessing":"oa:assessing", "slr":"http://rdf.onekin.org/resource/ns/slr/"}, {"datacite":"http://purl.org/spar/datacite/", "urn":"datacite:urn", "url":"datacite:url", "doi":"datacite:doi"}, {"dcterms": "http://purl.org/dc/terms/", "title": "dcterms:title", "created": "dcterms:created", "modified": "dcterms:modified"}, { '@vocab': 'http://rdf.onekin.org/resources/ns/' } ]

/// /UTILS
function doNothing () {}

function sleep (miliseconds) {
  var currentTime = new Date().getTime()
  while (currentTime + miliseconds >= new Date().getTime()) { }
}

function getObjectId (data, id) {
  for (let i = 0; i < data.length; i++) {
    let item = data [i]
    if (item.id === id){
      return item
    }
  }
  return data
}


/*
function isString (value) {
  return typeof value === 'string' || value instanceof String
}
*/

function escapalo (data){
  let textQuoteSelectorIndex
  if (Array.isArray(data.target)){
     textQuoteSelectorIndex = _.findIndex(data.target[0].selector, (selector) => { return selector.type === 'TextQuoteSelector' })
  }else{
    textQuoteSelectorIndex = _.findIndex(data.target.selector, (selector) => { return selector.type === 'TextQuoteSelector' })
  }
  if (textQuoteSelectorIndex > -1) {
    let pre = data.target[0].selector[textQuoteSelectorIndex].prefix
    data.target[0].selector[textQuoteSelectorIndex].prefix  = escape(pre)
    let suf = data.target[0].selector[textQuoteSelectorIndex].suffix
    data.target[0].selector[textQuoteSelectorIndex].suffix  = escape(suf)
  }
  if (data['text']) {
    data['text'] = escape(data['text'])
  }
  if (data['body']) {
    if (data.body.description) {
      data.body.description = escape(data.body.description)
    }
  }

  return data
}

function descapalo (data){
  if (!data) return data
  if (!data.target) return data
  let textQuoteSelectorIndex
  if (Array.isArray(data.target)){
     textQuoteSelectorIndex = _.findIndex(data.target[0].selector, (selector) => { return selector.type === 'TextQuoteSelector' })
     if (textQuoteSelectorIndex > -1) {
       let pre = data.target[0].selector[textQuoteSelectorIndex].prefix
       data.target[0].selector[textQuoteSelectorIndex].prefix  = unescape(pre)
       let suf = data.target[0].selector[textQuoteSelectorIndex].suffix
       data.target[0].selector[textQuoteSelectorIndex].suffix  = unescape(suf)
     }
  }else{
    textQuoteSelectorIndex = _.findIndex(data.target.selector, (selector) => { return selector.type === 'TextQuoteSelector' })
    if (textQuoteSelectorIndex > -1) {
      let pre = data.target.selector[textQuoteSelectorIndex].prefix
      data.target.selector[textQuoteSelectorIndex].prefix  = unescape(pre)
      let suf = data.target.selector[textQuoteSelectorIndex].suffix
      data.target.selector[textQuoteSelectorIndex].suffix  = unescape(suf)
    }
  }
  if (data['text']) {
    data['text'] = unescape(data['text'])
  }
  if (data['body']) {
    if (data.body.description) {
      data.body.description = escape(data.body.description)
    }
  }
  return data
}

function traverse (o) {
  for (var i in o) {
    //debuggingg('>>>> ' + i + ' <<<<' + JSON.stringify(o[i]))
    if (i === 'text') {
      o[i] = unescape(o[i])
    }
    if (i === 'description') {
      o[i] = unescape(o[i])
    }
    if (o[i]['@value'] && o[i]['type']=== 'xsd:long') {
      //alert (parseInt(o[i]['@value']))
        o[i] = parseInt(o[i]['@value'])
    }
    if (i === 'group' && o[i] !== null && typeof (o[i]) === 'object') {
      o[i] = o[i]['@value']
    }
    if (i === 'id' && o[i] !== null && typeof (o[i]) === 'object') {
    //  debuggingg('>>>> RETURNING')
      return traverse(o[i])
    }
    if (o[i] !== null && typeof (o[i]) === 'object') {
      // going one step down in the object tree!!
      //debuggingg('>>>> TRAVERSING')
      o[i] = traverse(o[i])
    }
  }
  return o
}

function apiCallJSON (settings, callback) {
  debuggingg('apiCallJSON:: ' + settings.data)
  axios(settings).catch(() => {
    if (_.isFunction(callback)) {
      callback(new Error('Unable to execute:  ' + settings.data), [])
    }
  }).then((response) => {
    if (!_.isUndefined(response)) {
      let expandedData = response.data
      if (expandedData.length === 0) {
        callback(null, [])
      } else {
        // compact a document according to a particular context
        // TODO To be solved when jsonld dependency get compilable
        /* jsonld.compact(expandedData, { '@context': contextualization }, function (err, compacted) {
          if (err) console.error('Error compacting: ' + err)
          callback(null, compacted)
        }) */
      }
    }
  })
}

function apiCall (settings, callback) {
  debuggingg('apiCall:: ' + settings.data)
  axios(settings).catch(() => {
    if (_.isFunction(callback)) {
      callback(new Error('Unable to execute:  ' + settings.data), [])
    }
  }).then((response) => {
    if (!_.isUndefined(response)) {
      if (!_.isUndefined(response.data.results[0])) { doNothing() } // debuggingg('RESULT:' + JSON.stringify(response.data.results[0]))
      if (!_.isUndefined(response.data.errors[0])) { doNothing() } // debuggingg('ERROR::' + JSON.stringify(response.data.errors[0]))
      let result = response.data
      callback(null, result)
    }
  })
}

/**
   * Giving an annotation data, it is created in Neo4J
   * @param context The this object to access configuration data
   * @param query
   * @param callback Function to execute after annotation creation
   */
function commitNeo4J (query, callback) {
  debuggingg(' QUERY>> ' + query)
  let url = contextus.baseURI + '/db/data/transaction/commit'
  let statement = `{ "statements" : [ {"includeStats" : true,
    "statement" :  "` + query + `"} ]}`
  let settings = {
    'async': true,
    'crossDomain': true,
    'url': url,
    'method': 'POST',
    'headers': {
      'authorization': 'Basic ' + contextus.userToken, // admin:onekin https://www.base64decode.org/   https://neo4j.com/docs/http-api/3.5/security/
      'content-type': 'application/json',
      'cache-control': 'no-cache'
    },
    data: statement
  }
  debuggingg(JSON.stringify(settings, null, 2))
  apiCall(settings, callback)
}

var verbose = true
function debuggingg (msg, priority) {
  if (priority === true) verbose = true
  if (verbose) {
    console.debug('::>' + msg)
  }
  if (priority === false) verbose = false
}

function randomString (length = 17, charSet) {
  charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'
  let randomString = ''
  for (let i = 0; i < length; i++) {
    let randomPoz = Math.floor(Math.random() * charSet.length)
    randomString += charSet.substring(randomPoz, randomPoz + 1)
  }
  return randomString + now.getMilliseconds()
}

function escapify (myJSON) {
  var myJSONString = JSON.stringify(myJSON)
  var myEscapedJSONString = myJSONString.replace(/'/g, "\\'").replace(/"/g, '\\"')
    .replace(/&/g, '\\&')
  // myEscapedJSONString is now ready to be POST'ed to the server.
  return myEscapedJSONString
}

/**
   * Giving an annotation data, it is created in Neo4J
   * @param context The this object to access configuration data
   * @param queries queries
   * @param callback Function to execute after annotation creation
   */
/* function commitNeo4JMultiple (queries, callback, context) {
  if (!context) {
    context = contextus
  }
  let url = context.baseURI + '/db/data/transaction/commit'
  let sts = `{ "statements" : [ `
  let first = true
  for (let i = 0; i < queries.length; i++) {
    if (first) {
      first = false
      sts += `{"includeStats" : true, "statement" :  "` + queries[i] + `"}`
    } else {
      sts += `, {"includeStats" : true, "statement" :  "` + queries[i] + `"}`
    }
  }
  sts += ` ]}`
  let settings = {
    'async': true,
    'crossDomain': true,
    'url': url,
    'method': 'POST',
    'headers': {
      'authorization': 'Basic ' + context.userToken, // IKER https:// neo4j.com/docs/http-api/3.5/security/
      'content-type': 'application/json',
      'cache-control': 'no-cache'
    },
    data: sts
  }
  apiCall(settings, callback)
} */

/**
 * Lauches a cypher query and returns the rdf representation
 * @param cypher
 * @param callback
 */
function cypherRDFNeo4J (cypher, callback) {
  let url = contextus.baseURI + '/rdf/cypheronrdf'
  let statement = ` {"cypher" : "` + cypher + `"}`
  let settings = {
    'async': true,
    'crossDomain': true,
    'url': url,
    'method': 'POST',
    'headers': {
      'authorization': 'Basic ' + contextus.userToken, // IKER https:// neo4j.com/docs/http-api/3.5/security/
      'content-type': 'application/json',
      'Accept': 'application/ld+json',
      'cache-control': 'no-cache'
    },
    data: statement
  }
  apiCallJSON(settings, callback)
}

function initializeGraph (err, response) {
  let q = "CREATE (:NamespacePrefixDefinition {`http://www.w3.org/ns/activitystreams#`: 'as',`http://xmlns.com/foaf/0.1/`: 'foaf', `http://www.w3.org/ns/oa#`: 'oa', `http://www.w3.org/ns/prov#`: 'prov', `http://rdf.onekin.org/resources/ns/`: 'onekin', `http://purl.org/spar/datacite/`: 'datacite', `http://purl.org/dc/terms/`: 'dcterms'})"
  if (err) {
    commitNeo4J(q, debuggingg, contextus)
    return
  }
  if (!_.isUndefined(response.results[0].data[0].row)) {
    if (response.results[0].data[0].row[0] === 0) {
      commitNeo4J(q, createIndex)
    }
  }
}

function createIndex (err, response) {
  let q = []
  q = 'CREATE INDEX ON :Resource(uri)'
  if (err) {
    commitNeo4J(q, debuggingg, contextus)
    return
  }
  commitNeo4J(q, debuggingg)
}

/// END UTILS ///

/**
 * Neo4J client class
 */
class Neo4JClient {
  /**
   * Create a Neo4J client
    * @param userName The user name for annotations
    * @param userToken The base64(user+password) to access the Neo4J API
  * @param baseURI The base URI of the Neo4J server. For example,  http:// localhost:7474
   */
  constructor (userName, userToken, baseURI) {
    this.userName = 'defaultUser'
    this.userToken = 'YWRtaW46b25la2lu' // admin:onekin
    this.baseURI = 'http://localhost:7474'
    this.baseN4J = 'http://neo4j.com/base/'
    if (userName) {
      if (userName != "") this.userName = userName //  btoa(user+":"+password)  // IKER: base64-encoded string of username:password.
    }
    if (userToken) {
      if (userToken != "") this.userToken = userToken //  btoa(user+":"+password)  // IKER: base64-encoded string of username:password.
    }
    //alert (this.userName+'::'+this.userToken )
    if (baseURI) {
      this.baseURI = baseURI //  btoa(user+":"+password)  // IKER: base64-encoded string of username:password.
    }
    this.group = {
      name: 'OpenSLR',
      description: 'Default Open Systematic Literature Review',
      id: "1",
      url: this.baseURI
    }
    contextus.userName = this.userName
    contextus.userToken = this.userToken
    contextus.baseURI = this.baseURI
    contextus.baseN4J = this.baseN4J
    let q = 'match (n:NamespacePrefixDefinition) return count(n)'
    commitNeo4J(q, initializeGraph)
  }

  /**
   * Giving an annotation data, it is created in Neo4J
   * @param data Annotation {@link https:// h.readthedocs.io/en/latest/api-reference/#operation/createAnnotation body schema}
   * @param callback Function to execute after annotation creation
   */
  createNewAnnotation (data, callback) {
    console.debug (JSON.stringify(data, null, 4) )
    sleep(100)
    if (!data['@type'] && !data['type']) {
      data['@type'] = 'Annotation'
    } else if (!data['@type'] && data['type']) {
      data['@type'] = data['type']
      delete data['type']
    }
    console.debug ('1')
    data['user'] = this.userName
    if (!data['@id'] && !data['id']) {
      data['@id'] = randomString()
    }
    if (data['@id'] && data['id']) {
      delete data['id']
    }
    if (!data['@id'].startsWith(this.baseN4J)) {
      data['@id'] = this.baseN4J + data['@id']
    }

    if (data['target'] && data['oa:target']) {
      data['target'] = data['oa:target']
      delete data['oa:target']
    }
console.debug ('2' + data['agreement'])
    if (data['agreement']){
      let gree = data['agreement']
      let value = data['body']['value']
      data['body']['value']= gree
      data['body']['onekin__value'] = value
    }

    data = escapalo (data)
    // data['permissions'] = null
console.debug ('3')
    let today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate()
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds()
    var dateTime = date+'T'+time+'Z'
    if (!data['dcterms:created'] && !data['created']) {
      data['created'] = dateTime
    }
    data['modified'] = dateTime
console.debug ('4')
    data['@context'] = contextualization
    let q = `CALL semantics.importRDFSnippet(' ` + escapify(data) + `', 'JSON-LD', { handleMultival: 'ARRAY' , multivalPropList : ['http://www.w3.org/ns/oa#hasBody', 'http://rdf.onekin.org/resources/ns/references','http://rdf.onekin.org/resources/ns/tags']})`
    debuggingg(' PRE-QUERY>> ' + q)
    commitNeo4J(q, (err, result) => {
      if (err) {
        let msg = 'Error creating annotation: ' + JSON.stringify(err)
        console.error(err)
        callback(new Error(msg))
      } else {
        data['user'] = this.userName
        data['id'] = data['@id'].replace(this.baseN4J, '')

        if (data['target'] && !data['oa:target']) {
          data['oa:target'] = data['target']
        }

        data = descapalo (data)
debuggingg ('result:: ' + JSON.stringify(data) )
        callback(null, data)
      }
    })
  }

  /**
   * Create a new, private group for the currently-authenticated user.
   * @param data Check the body request schema in https:// h.readthedocs.io/en/latest/api-reference/#operation/createGroup
   * @param callback
   */
  createNewGroup (data, callback) {
    callback(new Error('Neo4J does not manage groups'))
  }

  /**
   * Creates in Neo4J server sequentially a given list of annotations
   * @param annotations A list of annotation bodies
   * @param callback Function to execute after annotations are created
   * @return progress Holds progress of creating process, current and max values in number of pending annotations to finish.
   */
  createNewAnnotationsSequential (annotations, callback) {
    let createdAnnotations = []
    let progress = { current: 0, max: annotations.length }
    //  Create promise handler
    let runPromiseToCreateAnnotation = (d) => {
      return new Promise((resolve, reject) => {
        this.createNewAnnotation(d, (err, annotation) => {
          if (err) {
            reject(err)
          } else {
            createdAnnotations.push(annotation)
            resolve()
          }
        })
      })
    }
    let promiseChain = annotations.reduce(
      (chain, d, index) => {
        return chain.then(() => {
          progress.current = index //  Update progress current value
          return runPromiseToCreateAnnotation(d)
        })
      }, Promise.resolve()
    )
    promiseChain.catch((reject) => {
      if (_.isFunction(callback)) {
        callback(reject)
      }
    }).then(() => {
      progress.current = annotations.length
      if (_.isFunction(callback)) {
        callback(null, createdAnnotations)
      }
    })
  }

  /**
   * Create a list of annotations in parallel
   * @param annotations A list of annotation bodies
   * @param callback Function to execute after annotations are created
   */
  createNewAnnotationsParallel (annotations, callback) {
    let promises = []
    for (let i = 0; i < annotations.length; i++) {
      promises.push(new Promise((resolve, reject) => {
        this.createNewAnnotation(annotations[i], (err, response) => {
          if (err) {
            reject(err)
          } else {
            resolve(response)
          }
        })
        return true
      }))
    }
    Promise.all(promises).catch(() => {
      callback(new Error('Some annotations cannot be created'))
    }).then((responses) => {
      if (responses.length === annotations.length) {
        if (_.isFunction(callback)) {
          callback(null, responses)
        }
      } else {
        if (_.isFunction(callback)) {
          callback(new Error('Some annotations cannot be created'))
        }
      }
    })
  }

  /**
   * Given an array of annotations creates them in the Neo4J server
   * @param annotations
   * @param callback
   */
  createNewAnnotations (annotations, callback) {
    if (_.isArray(annotations) && !_.isEmpty(annotations)) {
      this.createNewAnnotationsParallel(annotations, callback)
    } else {
      if (_.isFunction(callback)) {
        callback(new Error('Annotations object is not an array or is empty.'))
      }
    }
  }

  /**
   * Returns users profile:
   * @param callback
   */
  getUserProfile (callback) {
    let profile = {
      'userid': this.userName,
      'display_name': this.userName,
      groups: [this.group],
      'annotations': [ ]
    }
    callback(null, profile)
  }

  /**
   * Fetches an annotation by id
   * @param id
   * @param callback
   */
  fetchAnnotation (id, callback) {
    let cypher = `match (r)<-[c]-(n)-[a]->(p)-[b]->(q) where n.uri = '` + this.baseN4J + id + `' return n,a,p,b,q, c, r`
    debuggingg('FETCHING ID => ' + id + ':::' + cypher)
    cypherRDFNeo4J(cypher, (err, data) => {
      if (err) {
        console.error(err)
      } else {
        let newdata = this.transformJSON(data, null, 2)
        newdata = getObjectId (newdata, this.baseN4J + id)
        if (!_.isArray(newdata.target)) {
          let array = [newdata.target]
          newdata.target = array
          newdata['oa:target'] = newdata.target
        } else {
          newdata['oa:target'] = newdata.target
        }
        //alert (JSON.stringify (newdata, null, 2))
        callback(null, newdata)
      }
    })
    this.cleanGarbage()
  }


  cleanGarbage () {
    // let cypher = `MATCH (n:Resource) WHERE not ()--> (n) AND NOT (n) -->() DELETE n `
    let cypher = `match (n:Resource) where not ()--> (n) AND  n.uri STARTS WITH 'genid' detach delete n `
    debuggingg('Cleaning garbage STARTING ')
    commitNeo4J(cypher, (err, data) => {
      if (err) {
        console.error(err)
      } else {
        debuggingg('Cleaning garbage => ' + JSON.stringify(data))
      }
    })
  }

  updateAnnotation (idold, data, callback) {
    data['@id'] = idold
    debuggingg('UPDATING IDOLD => ' + idold)
      this.deleteAnnotation(data, (err, res) => {
        if (err) console.error(err)
        data.created = res.created
        //alert (data.created)
        this.createNewAnnotation(data, callback)
      })
  }

  /**
   * Given an annotation or annotation id string, it deletes from Neo4J
   * @param annotation
   * @param callback
   */
  deleteAnnotation (annotation, callback) {
    let linking = false
    let id = null
    if (_.isString(annotation)) {
      id = annotation
      linking = true
    } else if (_.has(annotation, 'id')) {
      id = annotation.id
    } else if (_.has(annotation, '@id')) {
      id = annotation['@id']
    } else {
      callback(new Error('This is not an annotation or an annotation ID.'))
      return
    }

    if (!id.startsWith(this.baseN4J)) {
      id = this.baseN4J + id
    }
    // let cypher = `MATCH (n{uri : '` + id + `'})-[oa__hasTarget]->(p)-[oa__hasSelector]->(q) DETACH  DELETE  n,p,q`
    let cypher = `MATCH (n{uri : '` + id + `'})-[:oa__hasTarget]->(p)-[:oa__hasSelector]->(q) DETACH  DELETE  n,p,q`
    if (_.has(annotation, 'tags')) {
      if (annotation['tags'].includes('motivation:linking')) {
        cypher = `MATCH (n{uri : '` + id + `'}) DETACH  DELETE n`
      }
    }
    if (linking) {
      cypher = `MATCH (n{uri : '` + id + `'}) DETACH  DELETE n`
    }
    debuggingg('DELETING ID => ' + id + JSON.stringify(annotation))

    commitNeo4J(cypher, (err, data) => {
        if (err) {
          console.error(err)
        } else {
          callback(null, data)
        }
      })
  }

  /**
   * Given a list of annotations or annotation ids, they are deleted in Neo4J
   * @param annotations a list of annotations or list of strings with each id
   * @param callback
   */
  deleteAnnotations (annotations, callback) {
    //  Check and parse annotations to a list of ids (if it is not yet)
    let toDeleteAnnotations = []
    if (_.every(annotations, (annotation) => { return annotation.id })) {
      toDeleteAnnotations = _.map(annotations, 'id')
    } else if (_.every(annotations, String)) {
      toDeleteAnnotations = annotations
    }
    //  Create promises to delete all the annotations
    let promises = []
    for (let i = 0; i < toDeleteAnnotations.length; i++) {
      promises.push(new Promise((resolve, reject) => {
        this.deleteAnnotation(toDeleteAnnotations[i], (err, response) => {
          if (err) {
            reject(new Error('Unable to delete annotation id: ' + toDeleteAnnotations.id))
          } else {
            resolve(response)
          }
        })
        return true
      }))
    }
    //  When all the annotations are deleted
    Promise.all(promises).catch((rejectedList) => {
      //  TODO List of rejected annotations
      callback(new Error('Unable to delete some annotations: '))
    }).then((responses) => {
      callback(null, responses)
    })
  }

  /**
   * Search annotations
   * @param data
   * @param callback
   */
  searchAnnotations (data, callback) {
    // /Search by .....? Id, tags, group, user???
    let q = ''
    // URL

    let qmatch = `match (r)<-[c]-(n)-[a]->(p)-[b]->(q), (p)-[d]->(s)`
    let qreturn = ` return n,a,p,b,q,c,r,d,s`
    let qwhere = ` where `
    let qwhereboolean = false
    if (data.id) {
      qwhere += ` n.uri = '` + this.baseN4J + data.id + `' `
      qwhereboolean = true
      debuggingg('SEARCHING ID => ' + data.id)
    }

    if (data.uri && data.url) {
      if (qwhereboolean) qwhere += ` AND `
      qwhere += `( q.datacite__urn = '` + data.uri + `' `
      qwhere += `OR q.datacite__urn = '` + data.url + `' `
      qwhere += `OR q.datacite__url = '` + data.uri + `' `
      qwhere += `OR q.datacite__url = '` + data.url + `' `
      qwhere += `OR q.datacite__doi = '` + data.uri + `' `
      qwhere += `OR q.datacite__doi = '` + data.url + `') `
      qwhereboolean = true
      debuggingg('SEARCHING URI and URL => ' + data.uri + ' || ' + data.url)
    } else {
      if (data.uri) {
        if (qwhereboolean) qwhere += ` AND `
        qwhere += `( q.datacite__urn = '` + data.uri + `' `
        qwhere += `OR q.datacite__url = '` + data.uri + `' `
        qwhere += `OR q.datacite__doi = '` + data.uri + `') `
        qwhereboolean = true
        debuggingg('SEARCHING URI => ' + data.uri)
      }
      if (data.url) {
        if (qwhereboolean) qwhere += ` AND `
        qwhere += `( q.datacite__urn = '` + data.url + `' `
        qwhere += `OR q.datacite__url = '` + data.url + `' `
        qwhere += `OR q.datacite__doi = '` + data.url + `') `
        qwhereboolean = true
        debuggingg('SEARCHING URL => ' + data.url)
      }
    }
    // User
    if ((data.user)) {
      qmatch += `, (n)-[dct__creator]->(n2) `
      if (qwhereboolean) qwhere += ` AND `
      qwhere += ` n2.uri = '` + data.user + `' `
      qwhereboolean = true
      debuggingg('SEARCHING USER=> ' + data.user)
    }

    // Tags
    if ((data.tag || data.tags)) {
      let tags = []
      if (_.isArray(data.tags) && _.every(data.tags, _.isString)) {
        tags = data.tags
      }
      if (_.isString(data.tags)) {
        tags.push(data.tags)
      }
      if (_.isString(data.tag)) {
        tags.push(data.tag)
      }
      // Remove duplicated tags
      tags = _.uniq(tags)
      // Check if annotation's tags includes all the tags
      if (qwhereboolean) qwhere += ` AND `
      qwhere += ` '` + tags + `' IN n.onekin__tags `
      qwhereboolean = true
      var linking = false
      if (tags[0] === 'motivation:linking') {
        linking = true
        qreturn = ` return n,c`
      }
    }

    if (qwhereboolean) {
      q = qmatch + qwhere + qreturn
    } else {
      q = qmatch + qreturn
    }

    cypherRDFNeo4J(q, (err, data) => {
      if (err) {
        console.error(err)
        callback(err, null)
      } else {
        let newData = []
        if (linking && !_.isEmpty(data)) {
          if (_.isEmpty(data['@graph'])) {
            newData.push(data)
          } else newData = this.transformJSON(data)
        } else newData = this.transformJSON(data)
        if (linking) {
          debuggingg('THIS IS LINKING 1 ::::> ' + JSON.stringify(newData))
        }
        // newData = this.transformJSON(data)
        if (linking) {
          debuggingg('THIS IS LINKING ::::> ' + JSON.stringify(newData))
        }
        for (let i = 0; i < newData.length; i++) {
          if (!_.isArray(newData[i].tags)) {
            let array = []
            array.push(newData[i].tags)
            newData[i].tags = array
          }
          if (!_.isArray(newData[i].target)  && newData[i].motivation !== 'assessing') {
            let array = []
            array.push(newData[i].target)
            newData[i].target = array
            newData[i]['oa:target'] = newData[i].target
          } else {
            newData[i]['oa:target'] = newData[i].target
          }
        }
        // debuggingg('SEARCH ' + q + '\n POST-RESULT: ' + JSON.stringify(newData, null, 4), false)
        callback(null, newData)
      }
    })
    this.cleanGarbage()
  }

  /**
   * Transform
   * @param data json
   * @return annotation json in required format
   */
  transformJSON33 (data) {
    // let txt = JSON.stringify(data, null, 1)
    // txt = txt.replace(new RegExp('"id": "http://neo4j.com/base/', 'g'), '"id": "')
    // debuggingg('*******\nCJSON.parse :: \n ' + txt + '\n**********\n')
    // data = JSON.parse(txt)
    let ctxt = data['@context']
    let grafus = data['@graph'] || {}
    let idTextQuoteSelector = {}
    let idTarget = {}
    let annotation = []
    for (let i = 0; i < grafus.length; i++) {
      let olddatum = grafus[i]
      if (olddatum['type']) {
        if (olddatum['type'] === 'Annotation') {
          olddatum['@context'] = ctxt
          annotation.push(olddatum)
        }
        if (olddatum['type'].endsWith('Selector')) { // === 'TextQuoteSelector') {
          idTextQuoteSelector[olddatum['id']] = olddatum
        }
      } else {
        idTarget[olddatum['id']] = olddatum
      }
    }

    annotation = traverse(annotation)
    debuggingg('*******\nCJSON.parse 55 :: \n ' + JSON.stringify(annotation, null, 2) + '\n**********\n')
    return annotation
  }

  /**
   * Transform
   * @param data json
   * @return annotation json in required format
   */
  transformJSON (data) {
    //let txt = JSON.stringify(data, null, 1)
    // txt = txt.replace(new RegExp('"id": "http://neo4j.com/base/', 'g'), '"id": "')
    // debuggingg('*******\nCJSON.parse :: \n ' + txt + '\n**********\n')
    //data = JSON.parse(txt)
    let ctxt = data['@context']
    let grafus = data['@graph'] || {}
    let idTextQuoteSelector = {}
    let idTarget = {}
    let annotation = []
    for (let i = 0; i < grafus.length; i++) {
      let olddatum = grafus[i]
      if (olddatum['type']) {
        if (olddatum['type'] === 'Annotation') {
          olddatum['@context'] = ctxt
          annotation.push(olddatum)
        }
        if (olddatum['type'].endsWith('Selector')) { // === 'TextQuoteSelector') {
          idTextQuoteSelector[olddatum['id']] = olddatum
        }
      } else {
        idTarget[olddatum['id']] = olddatum
      }
    }
    let anntxt = JSON.stringify(annotation, null, 3)
    let list = null
    list = idTarget
    for (let j in list) {
      let key = j
      let val = list[j]
      debuggingg('>>>>>>> ' + key)
      anntxt = anntxt.replace(new RegExp('"' + key + '"', 'g'), JSON.stringify(val))
    }
    list = null
    list = idTextQuoteSelector
    for (let j in list) {
      let key = j
      let val = list[j]
      debuggingg('>>>>>>> ' + key)
      anntxt = anntxt.replace(new RegExp('"' + key + '"', 'g'), JSON.stringify(val))
    }
    annotation = JSON.parse(anntxt)
    annotation = traverse(annotation)
    for (let i = 0; i < annotation.length; i++) {
      annotation[i] = descapalo (annotation[i])
    }

    debuggingg('*******\nCJSON.parse 22 :: \n ' + JSON.stringify(annotation, null, 2) + '\n**********\n')
    return annotation
  }

  /**
   * Get list of groups for current user
   * @param data
   * @param callback
   */
  getListOfGroups (data, callback) {
    callback(null, this.group)
  }

  /**
   * Update a group metadata: name, description or id (only for Authorities). Check: https:// h.readthedocs.io/en/latest/api-reference/#tag/groups/paths/~1groups~1{id}/patch
   * @param groupId
   * @param data
   * @param callback
   */
  updateGroup (groupId, data, callback) {
    callback(new Error('Neo4J does not manage groups'))
  }

  /**
   * Retrieve a group data by its ID
   * @param groupId
   * @param callback
   */
  fetchGroup (groupId, callback) {
    callback(new Error('Neo4J does not manage groups'))
  }

  /**
   * Remove a member from a Neo4J group. Currently only is allowed to remove yourself.
   * @param data
   * @param callback
   */
  removeAMemberFromAGroup (data, callback) {
    callback(new Error('Neo4J does not manage groups'))
  }
}
export default Neo4JClient
