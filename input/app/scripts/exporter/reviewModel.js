/* eslint-disable */

class Review {
  constructor(){
    this._annotations = []
  }
  insertAnnotation(annotation){
    this._annotations.push(annotation)
  }
  get annotations(){
    return this._annotations
  }
  groupByCriterionInsideLevel (level){
    let that = this
    let groups = []
    let levelAnnotations = this._annotations.filter((e) => {return e.level===level})
    for(let i in levelAnnotations){
      if(groups.find((e) => {return e.annotations[0].criterion===levelAnnotations[i].criterion})!=null) continue;
      groups.push(new AnnotationGroup(levelAnnotations.filter((e) => {return e.criterion===levelAnnotations[i].criterion}),that));
    }
    return groups;
  }
  get strengths(){
    return this.groupByCriterionInsideLevel("Strength")
  }
  get minorConcerns(){
    return this.groupByCriterionInsideLevel("Minor weakness")
  }
  get majorConcerns(){
    return this.groupByCriterionInsideLevel("Major weakness")
  }
  get typos(){
    return this.annotations.filter((e) => {return e.criterion==="Typos"})
  }
  get references(){
    //let references = [].concat.apply([],this.annotations.filter((e) => {return e.level!=null&&e.level!=''}).map((e) => {return e.suggestedLiterature!=null ? e.suggestedLiterature : []}))
    let references = [].concat.apply([],this.annotations.map((e) => {return e.suggestedLiterature!=null ? e.suggestedLiterature : []}))
    return references.filter((item,pos) => {return references.indexOf(item) === pos}).sort()
  }
  get unsortedAnnotations(){
    return this.annotations.filter((e) => {return e.criterion!=="Typos"&&(e.level==null||e.level=="")})
  }
  toString(){
    // Summary of the work
    let t = "<Summarize the work>\n\n";

    // Strengths
    if(this.strengths.length>0) t+= "STRENGTHS:\n\n";
    if(this.strengths.length==1){
      t += "The main strength of this work is that "+this.strengths[0].toString()+"\n\n";
    }
    else if(this.strengths.length>1){
      for(let s in this.strengths){
        t += "- "+this.strengths[s].toString()+"\n\n";
      }
      t += "\n\n";
    }

    // Major concerns
    if(this.majorConcerns.length>0){
      t += "MAJOR WEAKNESSES:\n\n"
      t += "In the following, I express ";
      if(this.majorConcerns.length>1) t += "some important concerns ";
      else t += "an important concern ";
      t += "I have about the manuscript"
      if(this.majorConcerns.length==1) t += ". "+this.majorConcerns[0].toString()+"\n\n";
      else{
        t += ":\n\n";
        for(let i=0;i<this.majorConcerns.length;i++){
          t += (i+1)+"- "+this.majorConcerns[i].toString()+"\n\n";
        }
        t += "\n\n";
      }
    }

    // Minor concerns
    if(this.minorConcerns.length>0){
      t += "MINOR WEAKNESSES:\n\n"
      t += "There ";
      if(this.minorConcerns.length==1){
        t += "is ";
        if(this.majorConcerns.length>0) t+= "also ";
        t += "a minor point ";
      }
      else{
        t += "are ";
        if(this.majorConcerns.length>0) t+= "also ";
        t += "some minor points ";
      }
      t += "that should be clarified";
      if(this.minorConcerns.length==1) t += '. '+this.minorConcerns[0].toString()+"\n\n";
      else{
        t += ':\n\n'
        for(let i=0;i<this.minorConcerns.length;i++){
          t += (i+1)+"- "+this.minorConcerns[i].toString()+"\n\n";
        }
        t += "\n\n";
      }
    }

    // Typos
    if(this.typos.length>0){
      t += "TYPOS:\n\n"
      for(let i=0;i<this.typos.length;i++){
        t += "\t- "
        if(this.typos[i].page!=null) t+= '(Page '+this.typos[i].page+'): '
        t += '"'+this.typos[i].highlightText+'"'
        if(this.typos[i].comment!=null) t+= '\n\t'+this.typos[i].comment
        t += '\n'
      }
    }

    // Other comments
    if(this.unsortedAnnotations.length>0){
      t += "OTHER COMMENTS:\n\n"
      let reviewReferences = this.references
      for(let i=0;i<this.unsortedAnnotations.length;i++){
        t += "\t- "
        if(this.unsortedAnnotations[i].page!=null) t+= '(Page '+this.unsortedAnnotations[i].page+'): '
        t += '"'+this.unsortedAnnotations[i].highlightText+'"'
        if(this.unsortedAnnotations[i].comment!=null) t+= '\n\t'+this.unsortedAnnotations[i].comment
        let literature = this.unsortedAnnotations[i].suggestedLiterature!=null ? this.unsortedAnnotations[i].suggestedLiterature : []
        if(literature.length>0){
          t += '\n\tI would encourage the authors to look at the following papers: ';
          for(let j in literature){
            t += '['+(reviewReferences.indexOf(literature[j])+1)+']'
            if(j===literature.length-2&&literature.length>1) t += ' and '
            else if(literature.length>1&&j<literature.length-1) t += ', '
          }
        }
        t += '\n\n'
      }
    }

    // References
    let references = this.references
    if(references.length>0){
      t += "REFERENCES:\n"
      for(let i=0;i<references.length;i++){
        t += "\n["+(i+1)+"] "+references[i]
      }
    }

    t += "\n\n<Comments to editors>";

    return t;
  }
}

class Annotation {
  constructor(id,criterion,level,highlightText,page,comment,suggestedLiterature){
    this._criterion = criterion
    this._level = level
    this._highlightText = highlightText
    this._page = page
    this._comment = comment
    this._suggestedLiterature = suggestedLiterature
    this._id = id
  }
  get criterion(){
    return this._criterion
  }
  get level(){
    return this._level
  }
  get highlightText(){
    return this._highlightText
  }
  get page(){
    return this._page
  }
  get comment(){
    return this._comment
  }
  get suggestedLiterature(){
    return this._suggestedLiterature
  }
  get id(){
    return this._id
  }
}

class AnnotationGroup {
  constructor(annotations,review){
    this._annotations = annotations
    this._review = review
  }
  get annotations(){
    return this._annotations
  }
  toString(){
    let t = ''
    let concernToString = (c) => {
      let str = ''
      switch(c){
        case "Relevance":
          str += "I was not convinced of the relevance of the problem.";
          break;
        case "Significance":
          str += "I think that the importance of the problem needs to be emphasized.";
          break;
        case "Depth of analysis":
          str += "The paper seems to overlook the ‘why’ and focus too much on the ‘what’.";
          break;
        case "Adoption":
          str += "There is uncertainty about the adoption of the artefact by practitioners.";
          break;
        case "Generative potential":
          str += "The artefact lacks the potential to inspire further innovation in other new artefacts or new uses of existing artefacts.";
          break;
        case "Transferability":
          str += "There is no evidence about its generalisability to other domains.";
          break;
        case "Artefact":
          str += "The proposed solution is neither convincing nor even described in a suitable way."
          break;
        case "Novelty":
          str += "The authors need to show more clearly what is original in their solution."
          break;
        case "Evaluation":
          str += "I do have reservations about the evaluation process."
          break;
        case "Solution comparison":
          str += "The authors need to compare their artefact to other extant solutions."
          break;
        case "Behavior explanation":
          str += "There is no clear understanding of the behavior of the artefact."
          break;
        case "Research methods":
          str += "There are a number of issues with the methodology that need to be clarified/addressed."
          break;
        case "Justificatory knowledge":
          str += "I think the authors need to do a better job at grounding the design in existing research."
          break;
        case "Meta-requirements":
          str += "I would like to see more detail about the meta-requirements of the proposed solution."
          break;
        case "Meta-design":
          str += "A bit more detail about the meta-design would be helpful."
          break;
        case "Testable hypotheses":
          str += "The design theory lacks from testable hypotheses."
          break;
        case "Nascent Theory":
          // TODO
          break;
        case "Constructs":
          str += 'I would like to see more detail about constructs.'
          break;
        default:
          str += 'The authors need to do a better job as regards '+c.charAt(0).toLowerCase()+c.slice(1)+'.'
          break;
      }
      return str
    }
    switch(this._annotations[0].level){
      case "Strength":
        switch(this._annotations[0].criterion){
          case "Relevance":
            t += "the topic addressed is relevant and timely.";
            break;
          case "Significance":
            t += "it addresses an important topic.";
            break;
          case "Depth of analysis":
            t += "the paper is well-motivated and properly formulated.";
            break;
          case "Adoption":
            t += "the artefact has been adopted by real practitioners.";
            break;
          case "Generative potential":
            t += "it has the potential to inspire further innovation in other new artefacts or new uses of existing artefacts.";
            break;
          case "Transferability":
            t += "the solution can be generalised to other domains.";
            break;
          case "Artefact":
            t += "the proposed solution is clear and convincing."
            break;
          case "Novelty":
            t += "it finds a novel solution."
            break;
          case "Evaluation":
            t += "the evaluation was well conducted."
            break;
          case "Solution comparison":
            t += "the artefact has been compared with extant solutions."
            break;
          case "Behavior explanation":
            t += "there is clear understanding of the behavior of the artefact."
            break;
          case "Research methods":
            t += "research methods have been used rigurously."
            break;
          case "Justificatory knowledge":
            t += "the solution is rooted on existing research."
            break;
          case "Meta-requirements":
            t += "the meta-requirements have been specified."
            break;
          case "Meta-design":
            t += "the meta-design is present."
            break;
          case "Testable hypotheses":
            t += "testable hypotheses have been specified."
            break;
          case "Nascent Theory":
            // TODO
            break;
          case "Constructs":
            t += "constructs have been specified."
            break;
          default:
            t += this._annotations[0].criterion+' is/are ok.'
            break;
        }
        break
      case "Minor weakness":
        if(this._review.annotations.find((e) => {return e.criterion===this._annotations[0].criterion&&e.level==="Major concern"})!=null){
          t += "I have a more minor point "
          let connectors = ["with regard to","concerning","regarding","referring to"]
          t += connectors[Math.floor(Math.random()*connectors.length)]
          t += " the "
          switch(this._annotations[0].criterion){
            case "Relevance":
              t += "relevance of the problem.";
              break;
            case "Significance":
              t += "significance of the problem.";
              break;
            case "Depth of analysis":
              t += "depth of analysis of the problem.";
              break;
            case "Adoption":
              t += "adoption and use of the new artefact by practitioners.";
              break;
            case "Generative potential":
              t += "potential to inspire further innovation in other new artefacts or new uses of existing artefacts.";
              break;
            case "Transferability":
              t += "generalisability of the solution to other domains.";
              break;
            case "Artefact":
              t += "artefact."
              break;
            case "Novelty":
              t += "novelty of the artefact."
              break;
            case "Evaluation":
              t += "evaluation of the artefact."
              break;
            case "Solution comparison":
              t += "comparison of the artefact with other extant solutions."
              break;
            case "Behavior explanation":
              t += "behavior of the artefact."
              break;
            case "Research methods":
              t += "use of research methods."
              break;
            case "Justificatory knowledge":
              t += "grounding of the design in existing research."
              break;
            case "Meta-requirements":
              t += "meta-requirements."
              break;
            case "Meta-design":
              t += "meta-design."
              break;
            case "Testable hypotheses":
              t += "testeable hypotheses."
              break;
            case "Nascent Theory":
              // TODO
              break;
            case "Constructs":
              t += "constructs."
              break;
            default:
              t += this._annotations[0].criterion+'.'
              break;
          }
        }
        else t += concernToString(this._annotations[0].criterion)
        break
      case "Major weakness":
        t += concernToString(this._annotations[0].criterion)
        break
      default:
        break
    }
    for(let i in this._annotations){
      if(this._annotations[i].highlightText===null) continue
      t += '\n\t* '
      if(this._annotations[i].page!==null) t += '(Page '+this._annotations[i].page+'): '
      t += '"'+this._annotations[i].highlightText+'". ';
      if(this._annotations[i].comment!=null) t += '\n\t'+this._annotations[i].comment;
    }
    let literature = [].concat.apply([],this._annotations.map((e) => {return e.suggestedLiterature}))
    let reviewReferences = this._review.references
    if(literature.length>0){
      t += '\n\tI would encourage the authors to look at the following papers: ';
      for(let j in literature){
        t += '['+(reviewReferences.indexOf(literature[j])+1)+']'
        if(j===literature.length-2&&literature.length>1) t += ' and '
        else if(literature.length>1&&j<literature.length-1) t += ', '
      }
    }
    return t
  }
}

module.exports = {Review,Annotation,AnnotationGroup}

