/**
 * To set up JavaScript Transformation open configuration space properties
 * and go to "Configuration Space" -> "Transformation Configuration"
 * and add a JavaScript Transformation Module with this JavaScript.
 */

// global variables
/**
 * @type IPVVariantModel
 */
var gvdm;
/**
 * @type String
 */
var path;

//CSV preferences
var colsep = ";";
var textsep = ",";

/**
 * This function initializes the script. Global variables are set and all
 * necessary work is done, before transformation can start.
 * @param {IPVVariantModel} vdm The concrete variant description model.
 * @param {IPVModel[]} models The concrete feature and family models.
 * @param {java.util.Map<String, String>} variables The variables of the transformation configuration.
 * @param {java.util.Map<String, String>} parameter The parameter of the JavaScript transformation module.
 * @return {ClientTransformStatus} the status of this module method
 */
function init(vdm, models, variables, parameter) {
	// initialize global variables
	gvdm = vdm;

	//get output path
	path = variables.get("OUTPUT");

	// if no error occurred return OK status
	var status = new ClientTransformStatus();
	status.setMessage(Constants().EMPTY_STRING);
	status.setStatus(ClientTransformStatus().OK);

	return status;
}

/**
 * Do the work of this JavaScript transformation module
 * @return {ClientTransformStatus} the status of this module method
 */
function work() {
	// if no error occurred return OK status
	var status = new ClientTransformStatus();
	status.setMessage(Constants().EMPTY_STRING);
	status.setStatus(ClientTransformStatus().OK);

	try {
		/*
		We do not use the models given by the transformation framework, cause they are concrete.
		Meaning, that these models do only contain features, which are selected in the variant model.
		So we need to get the original models from the variant environment.
		 */
		var env = pure_variants().getVariantModelEnvironment(gvdm);
		if (env != null) {
			var featuremodels = env.getFeatureModels();
			exportModels(featuremodels);
		} else {
			status.setMessage("Transformation of VRM not supported.");
			status.setStatus(ClientTransformStatus().ERROR);
		}
	} catch (e) {
		// If something went wrong, catch error and return error status with
		// specific error message.
		status.setMessage(e.getMessage());
		status.setStatus(ClientTransformStatus().ERROR);
	}

	return status;
}

/**
 * Export all feature models
 * @param {List} models Models to be exported
 */
function exportModels(models) {
	var filename = "SelectionReport.csv";
	var fw = new java.io.FileWriter(new java.io.File(path, filename));
	//create headline
	var cols = new Array("Element", "Is in Variant");
	writeline(fw, cols);

	//iterate over all models of variant
	var iter = models.iterator();
	while (iter.hasNext()) {
		var model = new IPVModel(iter.next());
		//empty line for layout
		writeline(fw, new Array());
		//write model name in single line
		writeline(fw, new Array(model.getName()));
		//empty line for layout
		writeline(fw, new Array());

		//write elements
		var element = model.getElementWithID(model.getElementsRootID());
		writeElementLines(fw, element);
	}
	fw.flush();
	fw.close();
}

/**
 * Generate and write line for each element of variant
 * @param {java.io.FileWriter} fw The output stream
 * @param {IPVElement} element The element to be written
 */
function writeElementLines(fw, element) {
	var row = new Array();

	//get children of element
	var iter = element.getChildren().iterator();
	while (iter.hasNext()) {
		var e = new IPVElement(iter.next());
		row[0] = e.getName();
		if (gvdm.getSelection(e) == VariantElementState().SELECTION) {
			row[1] = "true";
		} else {
			row[1] = "false";
		}
		//write line for one child element
		writeline(fw, row);
		//recursive call to add child elements
		writeElementLines(fw, e);
	}
}

/**
 * Writes one line to csv file
 * @param {java.io.FileWriter} fw The output stream
 * @param {Array} line
 */
function writeline(fw, line) {
	for (var i = 0; i < line.length; i++) {
		if (line[i] != null) {
			if (line[i].indexOf(textsep) != -1 || line[i].indexOf(colsep) != -1
					|| line[i].indexOf('\n') != -1) {
				line[i] = line[i].replaceAll(textsep, textsep + textsep);
				fw.write(textsep + line[i] + textsep);
			} else {
				fw.write(line[i]);
			}
		}
		if (i + 1 < line.length) {
			fw.write(colsep);
		}
	}
	fw.write('\n');
}

/**
 * Finalize JavaScript transformation module
 * @return {ClientTransformStatus} the status of this module method
 */
function done() {
	var status = new ClientTransformStatus();
	status.setMessage(Constants().EMPTY_STRING);
	status.setStatus(ClientTransformStatus().OK);
	
	return status;
}
