Annotator.Plugin.qNoteAnnotator = (function() {
	function qNoteAnnotator(element, options) {
	this.element = element;
	this.options = options;
}

qNoteAnnotator.prototype.pluginInit = function() {
	this.annotator.on('annotationCreated', function(annotation) {
		var data = $.extend({},annotation);
		delete data.highlights;
		qNote.makeNote(data);
	});
	
	this.annotator.on('annotationEditorShown', function(editor, annotation) {
		qNote.addTag(editor);
	});
	
	this.annotator.on('annotationsLoaded', function(annotation) {
		qNote.annotationProcess(annotation);
	});
	
	
	
	//Blocked editing.
	this.annotator.viewer.options.readOnly=true;
	annotatorInstance = this.annotator;
};

return qNoteAnnotator;
})();