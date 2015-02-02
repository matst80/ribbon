/**
 * plugin.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

/*global tinymce:true */

// Internal unload handler will be called before the page is unloaded
// Needs to be outside the plugin since it would otherwise keep
// a reference to editor in closue scope
/*eslint no-func-assign:0 */
tinymce._beforeUnloadHandler = function() {
	var msg;

	tinymce.each(tinymce.editors, function(editor) {
		// Store a draft for each editor instance
		if (editor.plugins.cavsave) {
			editor.plugins.cavsave.save();
		}

		// Setup a return message if the editor is dirty
		if (!msg && editor.isDirty()) {
			msg = editor.translate("You have unsaved changes are you sure you want to navigate away?");
		}
	});

	return msg;
};

tinymce.PluginManager.add('cavsave', function(editor) {
	var settings = editor.settings, LocalStorage = tinymce.util.LocalStorage, prefix, started;

	prefix = settings.autosave_prefix || 'tinymce-autosave-{pid}{id}-';
	prefix = prefix.replace(/\{pid\}/g, wdpid||0);
	prefix = prefix.replace(/\{id\}/g, editor.id);

	function parseTime(time, defaultTime) {
		var multipels = {
			s: 1000,
			m: 60000
		};

		time = /^(\d+)([ms]?)$/.exec('' + (time || defaultTime));

		return (time[2] ? multipels[time[2]] : 1) * parseInt(time, 10);
	}


	function save(isAutoSave) {
		//if (editor.isDirty()) {
			var not = cav.ribbon.addNotification({icon:'spinner fa-spin',txt:editor.translate('Saving')});
			console.log('spara!!!',isAutoSave===true);
			setTimeout(function() {
				not.update({icon:'check',txt:editor.translate('Text saved')});
			},500);
			editor.fire('Saved');
		//}
	}

	function startAutoSave() {
		if (!started) {
			setInterval(function() {
				if (!editor.removed) {
					save(true);
				}
			}, settings.autosave_interval);

			started = true;
		}
	}

	settings.autosave_interval = parseTime(settings.autosave_interval, '30s');
	settings.autosave_retention = parseTime(settings.autosave_retention, '20m');

	function postRender() {
		/*
		var self = this;

		self.disabled(editor.isDirty());

		editor.on('Saved', function() {
			self.disabled(editor.isDirty());
		});

		startAutoSave();
		*/
	}

	
	editor.addButton('save', {
		title: 'Save',
		onclick: save,
		onPostRender: postRender
	});

	editor.addMenuItem('save', {
		text: 'Save',
		onclick: save,
		onPostRender: postRender,
		context: 'file'
	});
/*
	function isEmpty(html) {
		var forcedRootBlockName = editor.settings.forced_root_block;

		html = tinymce.trim(typeof(html) == "undefined" ? editor.getBody().innerHTML : html);

		return html === '' || new RegExp(
			'^<' + forcedRootBlockName + '[^>]*>((\u00a0|&nbsp;|[ \t]|<br[^>]*>)+?|)<\/' + forcedRootBlockName + '>|<br>$', 'i'
		).test(html);
	}
*/
	editor.on('saveContent', function() {
		save();
	});

	window.onbeforeunload = tinymce._beforeUnloadHandler;

	
	this.save = save;
});