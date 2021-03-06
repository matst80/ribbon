/**
 * theme.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

/*global tinymce:true */

tinymce.ThemeManager.add('cavagent', function(editor) {
	var self = this, settings = editor.settings, Factory = tinymce.ui.Factory, each = tinymce.each, DOM = tinymce.DOM;

	// Default menus
	var defaultMenus = {
		//file: {title: 'File', items: 'newdocument'},
		edit: {title: 'Edit', items: 'undo redo | cut copy paste pastetext | selectall'},
		insert: {title: 'Insert', items: '|'},
		view: {title: 'View', items: 'visualaid | code'},
		format: {title: 'Format', items: 'formats | removeformat'},
		table: {title: 'Table'},
	};

	var defaultToolbar = "save undo redo | styleselect removeformat | bold italic | alignleft aligncenter alignright alignjustify | " +
		"bullist numlist outdent indent | link image";

	/**
	 * Creates the toolbars from config and returns a toolbar array.
	 *
	 * @return {Array} Array with toolbars.
	 */
	function createToolbars() {
		var toolbars = [];

		function addToolbar(items) {
			var toolbarItems = [], buttonGroup;

			if (!items) {
				return;
			}

			each(items.split(/[ ,]/), function(item) {
				var itemName;

				function bindSelectorChanged() {
					var selection = editor.selection;

					if (itemName == "bullist") {
						selection.selectorChanged('ul > li', function(state, args) {
							var nodeName, i = args.parents.length;

							while (i--) {
								nodeName = args.parents[i].nodeName;
								if (nodeName == "OL" || nodeName == "UL") {
									break;
								}
							}

							item.active(state && nodeName == "UL");
						});
					}

					if (itemName == "numlist") {
						selection.selectorChanged('ol > li', function(state, args) {
							var nodeName, i = args.parents.length;

							while (i--) {
								nodeName = args.parents[i].nodeName;
								if (nodeName == "OL" || nodeName == "UL") {
									break;
								}
							}

							item.active(state && nodeName == "OL");
						});
					}

					if (item.settings.stateSelector) {
						selection.selectorChanged(item.settings.stateSelector, function(state) {
							item.active(state);
						}, true);
					}

					if (item.settings.disabledStateSelector) {
						selection.selectorChanged(item.settings.disabledStateSelector, function(state) {
							item.disabled(state);
						});
					}
				}

				if (item == "|") {
					buttonGroup = null;
				} else {
					if (Factory.has(item)) {
						item = {type: item};

						if (settings.toolbar_items_size) {
							item.size = settings.toolbar_items_size;
						}

						toolbarItems.push(item);
						buttonGroup = null;
					} else {
						if (!buttonGroup) {
							buttonGroup = {type: 'buttongroup', items: []};
							toolbarItems.push(buttonGroup);
						}

						if (editor.buttons[item]) {
							// TODO: Move control creation to some UI class
							itemName = item;
							item = editor.buttons[itemName];

							if (typeof(item) == "function") {
								item = item();
							}

							item.type = item.type || 'button';

							if (settings.toolbar_items_size) {
								item.size = settings.toolbar_items_size;
							}

							item = Factory.create(item);
							buttonGroup.items.push(item);

							if (editor.initialized) {
								bindSelectorChanged();
							} else {
								editor.on('init', bindSelectorChanged);
							}
						}
					}
				}
			});

			toolbars.push({type: 'toolbar', layout: 'flow', items: toolbarItems});

			return true;
		}

		// Convert toolbar array to multiple options
		if (tinymce.isArray(settings.toolbar)) {
			// Empty toolbar array is the same as a disabled toolbar
			if (settings.toolbar.length === 0) {
				return;
			}

			tinymce.each(settings.toolbar, function(toolbar, i) {
				settings["toolbar" + (i + 1)] = toolbar;
			});

			delete settings.toolbar;
		}

		// Generate toolbar<n>
		for (var i = 1; i < 10; i++) {
			if (!addToolbar(settings["toolbar" + i])) {
				break;
			}
		}

		// Generate toolbar or default toolbar unless it's disabled
		if (!toolbars.length && settings.toolbar !== false) {
			addToolbar(settings.toolbar || defaultToolbar);
		}

		if (toolbars.length) {
			return {
				type: 'panel',
				layout: 'stack',
				classes: "toolbar-grp",
				ariaRoot: true,
				ariaRemember: true,
				items: toolbars
			};
		}
	}

	/**
	 * Creates the menu buttons based on config.
	 *
	 * @return {Array} Menu buttons array.
	 */
	function createMenuButtons() {
		var name, menuButtons = [];

		function createMenuItem(name) {
			var menuItem;

			if (name == '|') {
				return {text: '|'};
			}

			menuItem = editor.menuItems[name];

			return menuItem;
		}

		function createMenu(context) {
			var menuButton, menu, menuItems, isUserDefined, removedMenuItems;

			removedMenuItems = tinymce.makeMap((settings.removed_menuitems || '').split(/[ ,]/));

			// User defined menu
			if (settings.menu) {
				menu = settings.menu[context];
				isUserDefined = true;
			} else {
				menu = defaultMenus[context];
			}

			if (menu) {
				menuButton = {text: menu.title};
				menuItems = [];

				// Default/user defined items
				each((menu.items || '').split(/[ ,]/), function(item) {
					var menuItem = createMenuItem(item);

					if (menuItem && !removedMenuItems[item]) {
						menuItems.push(createMenuItem(item));
					}
				});

				// Added though context
				if (!isUserDefined) {
					each(editor.menuItems, function(menuItem) {
						if (menuItem.context == context) {
							if (menuItem.separator == 'before') {
								menuItems.push({text: '|'});
							}

							if (menuItem.prependToContext) {
								menuItems.unshift(menuItem);
							} else {
								menuItems.push(menuItem);
							}

							if (menuItem.separator == 'after') {
								menuItems.push({text: '|'});
							}
						}
					});
				}

				for (var i = 0; i < menuItems.length; i++) {
					if (menuItems[i].text == '|') {
						if (i === 0 || i == menuItems.length - 1) {
							menuItems.splice(i, 1);
						}
					}
				}

				menuButton.menu = menuItems;

				if (!menuButton.menu.length) {
					return null;
				}
			}

			return menuButton;
		}

		var defaultMenuBar = [];
		if (settings.menu) {
			for (name in settings.menu) {
				defaultMenuBar.push(name);
			}
		} else {
			for (name in defaultMenus) {
				defaultMenuBar.push(name);
			}
		}

		var enabledMenuNames = typeof(settings.menubar) == "string" ? settings.menubar.split(/[ ,]/) : defaultMenuBar;
		for (var i = 0; i < enabledMenuNames.length; i++) {
			var menu = enabledMenuNames[i];
			menu = createMenu(menu);

			if (menu) {
				menuButtons.push(menu);
			}
		}

		return menuButtons;
	}

	/**
	 * Adds accessibility shortcut keys to panel.
	 *
	 * @param {tinymce.ui.Panel} panel Panel to add focus to.
	 */
	function addAccessibilityKeys(panel) {
		/*
		function focus(type) {
			var item = panel.find(type)[0];

			if (item) {
				item.focus(true);
			}
		}

		editor.shortcuts.add('Alt+F9', '', function() {
			focus('menubar');
		});

		editor.shortcuts.add('Alt+F10', '', function() {
			focus('toolbar');
		});

		editor.shortcuts.add('Alt+F11', '', function() {
			focus('elementpath');
		});

		panel.on('cancel', function() {
			editor.focus();
		});*/
	}

	/**
	 * Resizes the editor to the specified width, height.
	 */
	function resizeTo(width, height) {
		/*
		var containerElm, iframeElm, containerSize, iframeSize;

		function getSize(elm) {
			return {
				width: elm.clientWidth,
				height: elm.clientHeight
			};
		}

		containerElm = editor.getContainer();
		iframeElm = editor.getContentAreaContainer().firstChild;
		containerSize = getSize(containerElm);
		iframeSize = getSize(iframeElm);

		if (width !== null) {
			width = Math.max(settings.min_width || 100, width);
			width = Math.min(settings.max_width || 0xFFFF, width);

			DOM.setStyle(containerElm, 'width', width + (containerSize.width - iframeSize.width));
			DOM.setStyle(iframeElm, 'width', width);
		}

		height = Math.max(settings.min_height || 100, height);
		height = Math.min(settings.max_height || 0xFFFF, height);
		DOM.setStyle(iframeElm, 'height', height);
*/
		editor.fire('ResizeEditor');
	}

	function resizeBy(dw, dh) {
		//var elm = editor.getContentAreaContainer();
		//self.resizeTo(elm.clientWidth + dw, elm.clientHeight + dh);
	}

	/**
	 * Renders the inline editor UI.
	 *
	 * @return {Object} Name/value object with theme data.
	 */
	function renderInlineUI(args) {
		var panel, inlineToolbarContainer;

		if (settings.fixed_toolbar_container) {
			inlineToolbarContainer = DOM.select(settings.fixed_toolbar_container)[0];
		}

		function reposition() {
			/*
			if (panel && panel.moveRel && panel.visible() && !panel._fixed) {
				// TODO: This is kind of ugly and doesn't handle multiple scrollable elements
				var scrollContainer = editor.selection.getScrollContainer(), body = editor.getBody();
				var deltaX = 0, deltaY = 0;

				if (scrollContainer) {
					var bodyPos = DOM.getPos(body), scrollContainerPos = DOM.getPos(scrollContainer);

					deltaX = Math.max(0, scrollContainerPos.x - bodyPos.x);
					deltaY = Math.max(0, scrollContainerPos.y - bodyPos.y);
				}

				panel.fixed(false).moveRel(body, editor.rtl ? ['tr-br', 'br-tr'] : ['tl-bl', 'bl-tl', 'tr-br']).moveBy(deltaX, deltaY);
			}
			*/
		}

		function show() {
			/*if (panel) {
				panel.show();
				reposition();
				DOM.addClass(editor.getBody(), 'mce-edit-focus');
			}*/
		}

		function hide() {
			/*if (panel) {
				panel.hide();
				DOM.removeClass(editor.getBody(), 'mce-edit-focus');
			}*/
		}

		function render() {
			if (panel) {
				if (!panel.visible()) {
					show();
				}

				return;
			}

			var menus = createMenuButtons();

			var settingItems = ['onclick','cmd','format'];

			var menuMapping = {
				'onclick':'click',
				'text':'txt',
				'cmd':'cmd',
				'icon':'icon',
				'format':'format',
				'preview':'preview',
				'textStyle':'textStyle',
				'onPostRender':'postrender',
				'onPreRender':'prerender',
				'onshow':'show',
				'html':'customHTML',
				'onhide':'hide',
				'context':'ctx'
			}

			function convert(d,def) {
				var nd = {isMce:1};
				var sett = {};
				for(i in menuMapping)
				{
					var val=null;
					if (def && def[i])
						val = def[i];
					if (d[i])
						val = d[i];
					if (val) {
						
						sett[i] = val;
						nd[menuMapping[i]] = val;
					}
				}
				nd.txt = tinymce.translate(d.text);
				if (d.text=='|' || d.text=='-') {
					nd.isSeparator = true;
				}
				
				//nd.elmData = sett;

				return new cav.classes.menuitem(nd);
			}

			var cavedit = settings.editorReference;

			function parseMenu(node,parent,defaults) {
				for(var i in node)
				{
					var d = node[i];
					var newitem = convert(d,defaults);
					if (!parent) {
						cavedit.items.push(newitem);
						cav.ribbon.addMenu(newitem);
					}
					else
						parent.addItem(newitem);
					if (d.menu && d.menu.length)
					{
						parseMenu(d.menu,newitem,defaults);
					}
					if (d.menu && d.menu.items) {

						parseMenu(d.menu.items,newitem,d.menu.itemDefaults);
					}
				}
			}

			parseMenu(menus);

			var tbMapping = {
				'onclick':'click',
				'title':'title',
				'icon':'icon',
				'text':'txt',
				'tooltip':'tooltip',
				'cmd':'cmd',
				'format':'format',
				'preview':'preview',
				'textStyle':'textStyle',
				'onPostRender':'postrender',
				'onPreRender':'prerender',
				'onshow':'show',
				'html':'customHTML',
				'onhide':'hide',
				'context':'ctx'
			}

			function mapTb(d,def) {
				var ret = {};
				var nd = {isMce:1};
				var sett = {};
				for(i in tbMapping)
				{
					var val=null;
					if (def && def[i])
						val = def[i];
					if (d[i])
						val = d[i];
					//console.log(i,val);
					if (val) {
						if (settingItems.indexOf(i))
							sett[i] = val;
						nd[tbMapping[i]] = val;
					}
				}
				//if (nd.txt)
					//nd.txt = tinymce.translate(nd.txt);
				if (d.text=='|') {
					nd.isSeparator = true;
				}
				 
				nd.elmData = sett;
				return nd;
			}

			var typeMapping = {
				'toolbar':function(d,p) { 
					return p;
				},
				'buttongroup':function(d,p) {
					return new cav.classes.buttongroup({txt:'test',data:d});
				},
				'menubutton':function(d,p) {
					var ret = new cav.classes.menubutton(mapTb(d.settings));
					parseMenu(d.settings.menu.items,ret,d.settings.menu.itemDefaults);
					return ret;
				},
				'splitbutton':function(d,p) {
					//console.log('split',d);
					return new cav.classes.btn(mapTb(d.settings));
				},
				'menu':function(d,p) {
					return new cav.classes.menuitem(mapTb(d.settings));
				},
				'button':function(d,p) {
					return new cav.classes.btn(mapTb(d.settings));
				}
			};

			function tbconv(d,parent) {
				var tp = typeMapping[d.type]; 
				if (tp)
					return tp(d,parent);
				else {
					console.log(d.type,d);
					return parent;
				}
				
			}

			var tb = cav.ribbon.addTab({txt:'textedit',autoopen:true});
			cavedit.items.push(tb);

			function parseToolbar(node,parent) {
				//console.log('node',node);
				if (node.items) {
					for(var i in node.items)
					{
						var d = node.items[i];
						var newitem = tbconv(d,parent);
						parent.addItem(newitem);
						
						if (d.items && d.items.length)
						{
							parseToolbar(d,newitem);
						}
					}
				}
			}
			
			parseToolbar(createToolbars(),tb);
			
/*
			// Render a plain panel inside the inlineToolbarContainer if it's defined
			panel = self.panel = Factory.create({
				type: inlineToolbarContainer ? 'panel' : 'floatpanel',
				role: 'application',
				classes: 'tinymce tinymce-inline',
				layout: 'flex',
				direction: 'column',
				align: 'stretch',
				autohide: false,
				autofix: true,
				fixed: true,//!!inlineToolbarContainer,
				border: 0,
				items: [
					settings.menubar === false ? null : {type: 'menubar', border: '0 0 1 0', items: createMenuButtons()},
					createToolbars()
				]
			});
*/
			// Add statusbar
			/*if (settings.statusbar !== false) {
				panel.add({type: 'panel', classes: 'statusbar', layout: 'flow', border: '1 0 0 0', items: [
					{type: 'elementpath'}
				]});
			}*/

			editor.fire('BeforeRenderUI');
			//panel.renderTo(inlineToolbarContainer || document.body).reflow();

			addAccessibilityKeys(panel);
			show();
			
			//editor.on('nodeChange', reposition);
			editor.on('activate', show);
			editor.on('deactivate', hide);

			editor.nodeChanged();
		}

		settings.content_editable = true;
/*
		editor.on('focus', function() {
			// Render only when the CSS file has been loaded
			if (args.skinUiCss) {
				tinymce.DOM.styleSheetLoader.load(args.skinUiCss, render, render);
			} else {
				render();
			}
		});
*/
		if (args.skinUiCss) {
				tinymce.DOM.styleSheetLoader.load(args.skinUiCss, render, render);
		} else {
			render();
		}

		//editor.on('blur hide', hide);

		// Remove the panel when the editor is removed
		editor.on('remove', function() {
			if (panel) {
				panel.remove();
				panel = null;
			}
		});

		// Preload skin css
		if (args.skinUiCss) {
			tinymce.DOM.styleSheetLoader.load(args.skinUiCss);
		}

		return {};
	}

	

	/**
	 * Renders the UI for the theme. This gets called by the editor.
	 *
	 * @param {Object} args Details about target element etc.
	 * @return {Object} Theme UI data items.
	 */
	self.renderUI = function(args) {
		var skin = settings.skin !== false ? settings.skin || 'lightgray' : false;

		if (skin) {
			var skinUrl = settings.skin_url;

			if (skinUrl) {
				skinUrl = editor.documentBaseURI.toAbsolute(skinUrl);
			} else {
				skinUrl = tinymce.baseURL + '/skins/' + skin;
			}

			// Load special skin for IE7
			// TODO: Remove this when we drop IE7 support
			if (tinymce.Env.documentMode <= 7) {
				args.skinUiCss = skinUrl + '/skin.ie7.min.css';
			} else {
				args.skinUiCss = skinUrl + '/skin.min.css';
			}

			// Load content.min.css or content.inline.min.css
			editor.contentCSS.push(skinUrl + '/content' + (editor.inline ? '.inline' : '') + '.min.css');
		}

		// Handle editor setProgressState change
		editor.on('ProgressState', function(e) {
			self.throbber = self.throbber || new tinymce.ui.Throbber(self.panel.getEl('body'));

			if (e.state) {
				self.throbber.show(e.time);
			} else {
				self.throbber.hide();
			}
		});

		if (settings.inline) {
			return renderInlineUI(args);
		}

		return renderIframeUI(args);
	};

	self.resizeTo = resizeTo;
	self.resizeBy = resizeBy;
});
