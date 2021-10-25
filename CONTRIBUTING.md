# Information for contributors
Currently, WACline provides up to 111 features that can be reused to develop different variants for different annotation purposes. You can see a complete documentation of available features [here](https://onekin.github.io/WacLine/featureModel/). It includes a textual description and in some cases includes a screenshot of the user interface. However, some specific annotation workflows can require additional features. It is possible to contribute by forking the project and developing your own features to support new capabilities: new annotation storage connectors (like solid, mysql, elasticsearch,...), new annotation production purposes (describing, linking,...), new visualizations (diagrams, real-time charts,...). Try to always think about reusability by third parties, providing an understandable description, commented code or reusable modules, if it is possible. New contributions to the main project (bug fixes, enhancements, improvements, new features, optimizations) can be proposed opening a pull request.

Most of the common bugs and problems we have found (and how to solve them) while developing in WACline using Pure::Variants can be found [here](https://github.com/onekin/WacLine/wiki/Common-bugs-when-developing-with-eclipse-pure-variants-and-wacline). Feel free to open a new issue whether it exists any problem in configuration, building or deploying steps.

In the following lines we present main aspects of WACline's development, that can help you to introduce yourself in how is it developed.

## Conceptual model over web annotations
WACline follows W3C annotation recommendations in terms of protocol (how annotations are transported), model (how annotations are represented) and vocabulary (terms used to describe an annotation on the web). The following interactive concept map define some main concepts of wacline that will be used in feature modeling, component naming and among the source code of the project.
[![image](https://user-images.githubusercontent.com/6429012/138644698-a905d7ae-a62d-4b48-8a8f-9f7627294c6a.png)](https://rebrand.ly/webAnnotationCmap)

## Feature model
The feature model shows the functionalities that are implemented in WACline in a hierarchical structure. The following diagram only represents the most general groups and features developed in WACline.
![Main components in WACline's feature model](https://onekin.github.io/WacLine/assets/FeatureModelDiagram.png)
As WACline is a pure::variants project, you can find the complete feature model in WebAnnotator.xfm file. Additionally, there exists a Hosting.xfm that describes some specific features developed for annotation in some websites such as ACM, Springer or Moodle.

Features are grouped in one of the main categories for annotations (Purposes, Operations, Annotation Servers, Target or Codebook). When developing new features, it is necessary to add it in the feature model, in the correspondin category, depending on what affects the new functionality (e.g.: a new functionality to check for spelling mistakes in comments, should create a feature in Purposes->Comments->SpellChecker). It can have restrictions or requirements (e.g.: Spellchecker requires Purpose comment to be activated). It can have attributes, which can be parameters that let you configure the spell checker (e.g.: default language).

## Family model and architecture
WACline's main architecture components are illustrated in the following diagram. Basically it follows the same organization as root features in the feature model for the contentScript, while the entrypoint, as same as in all the browser extensions is the manifest, where declaration for background, popup and content script is done.
![WacLineComponentDiagram](https://user-images.githubusercontent.com/6429012/135595890-f568fbbc-458e-41d0-861e-42d883f00aab.jpg)

The initialization of components is done via `ContentScriptManager.js` for contentscript, while for background is done in `background.js`. Communication among browser extension components is done via chrome messaging, while communication among 

## Source code
### Annotated code using pure:variants clauses
WACline is an annotated SPL. Annotated SPLs resort to preprocessor directives (a.k.a. \#ifdefs) to realize variability in code. The following figure provides a simple snippet as an example for feature Autocomplete. In configuration step, if Autocomplete is selected, the code between opening clause and closing close will be added to the corresponding script, block between lines #231-243. Otherwise, it is filtered out.

![image](https://user-images.githubusercontent.com/6429012/135641680-5550df59-9d06-441d-b6eb-a242c5665ac6.png)


### Coding style
The coding style, with the specific diference of annotating code, it is done in Vanilla Javascript following [Standard Javascript](https://standardjs.com/index.html) style.
