/**
 * To set up JavaScript Transformation open configuration space properties
 * and go to "Configuration Space" -> "Transformation Configuration"
 * and add a JavaScript Transformation Module with this JavaScript.
 */

/**
 * Transformation module instance
 */
var pv_module = module_instance();

/**
 * Do the work of this JavaScript transformation module
 * @return {ClientTransformStatus} the status of this  module method
 */
function setSelectedFeatures() {

    var selected_features = {};
    try {
        var env = pv_module.getVariantEnvironment();
        if (env == null) {
            status.setMessage("Transformation of VRM not supported.");
            status.setStatus(ClientTransformStatus().ERROR);
        } else {
            var concreteModels = env.getFeatureModels();
            var iter = concreteModels.iterator();
            while (iter.hasNext()) {
                var model = new IPVModel(iter.next());

                //get root element of current model
                var root = model.getElementWithID(model.getElementsRootID());
                //process element lines
                setFeatures(root, selected_features);
            }
        }
    } catch (e) {
        console().write(e);
    }
    return selected_features;
}

/**
 * Print the information of a feature to the output file
 * and do to the children.
 * @param {IPVElement} element The element to print
 */
function setFeatures(element, selected_features) {
    // add information to output file
    var varEl = pv_module.getVariantModel().getSelectionOfReference(element);
    var selection = "-";//if no selection decision was made by now, we simply count them as unselected
    if (varEl != null) {//only if selection decision was made by now
        //get selection of current element
        selection = varEl.getType();
        if (selection.equals(ModelConstants().SELECTED_TYPE)) {
            selected_features[element.getName()] = true;
        } else {
            selected_features[element.getName()] = false;
        }
    }else if(element.getName()!=null){
        selected_features[element.getName()] = false;
    }

    // get Children of current element
    var iter = element.getChildren().iterator();
    while (iter.hasNext()) {
        setFeatures(iter.next(), selected_features);
    }
}

