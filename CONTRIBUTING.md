# Information for contributors
Currently, WACline provides up to 111 features that can be reused to develop different variants for different annotation purposes. You can see a complete documentation of available features [here](https://onekin.github.io/WacLine/featureModel/). It includes a textual description and in some cases includes a screenshot of the user interface. However, some specific annotation workflows can require additional features. It is possible to contribute by forking the project and developing your own features to support new capabilities: new annotation storage connectors (like solid, mysql, elasticsearch,...), new annotation production purposes (describing, linking,...), new visualizations (diagrams, real-time charts,...). Try to always think about reusability by third parties, providing an understandable description, commented code or reusable modules, if it is possible. New contributions to the main project (bug fixes, enhancements, improvements, new features, optimizations) can be proposed opening a pull request.

In the following lines we present main aspects of WACline's development, that can help you to introduce yourself in how is it developed.

## Conceptual model over web annotations
WACline follows W3C annotation recommendations in terms of protocol (how annotations are transported), model (how annotations are represented) and vocabulary (terms used to describe an annotation on the web). The following concept map define some main concepts of wacline that will be used in feature modeling, component naming and among the source code of the project.

## Feature model
![Main components in WACline's feature model](https://onekin.github.io/WacLine/assets/FeatureModelDiagram.png)

## Family model and architecture
WACline's main architecture components are illustrated in the following diagram. Basically it follows the same organization as root features in the feature model for the contentScript, while the entrypoint, as same as in all the browser extensions is the manifest, where declaration for background, popup and content script is done.
![WacLineComponentDiagram](https://user-images.githubusercontent.com/6429012/135595890-f568fbbc-458e-41d0-861e-42d883f00aab.jpg)

The initialization of components is done via ContentScriptManager.js for contentscript, while 

Communication among 

## Source code
### Annotated code using pure:variants clauses

### Coding style
