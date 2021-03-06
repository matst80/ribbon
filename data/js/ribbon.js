(function(w,doc,$){

	bdy = $('body');


	var globalSettings = {
		scrollTimeout:1500
	};

	var trans = function(a,b) {
		return b||a;
	}

	function parseMulti(data,cb)
	{
		var ret = [];
		if (!Array.isArray(data))
		 	data = [data];

		for(i in data) {
			ret.push(cb(data[i]));
		}
		return ret.length==1?ret[0]:ret;
	}

	var iconmap = {
		'redo':'repeat',
		'bullist':'list-ul',
		'numlist':'list-ol',
		'removeformat':'eraser'
	}

	function iconMap(d) {
		if (iconmap[d])
			return iconmap[d];
		return d.replace('align','align-');
	}

	function loadClass(cls,cb,err) {
		ql.postload('/js/cls_'+cls+".js",function() {
			var cl = cav.classes[cls];
			if (cl)
				cb(cl);
			else if (err)
				err({error:'no class found'});
		});
	}

	var cav = w.cav = {
		classes : {},
		getClass:function(cls,cb) {
			var localClass = cav.classes[cls];
			if (!localClass)
			{
				loadClass(cls,function(ret) {
					console.log('loaded',ret);
					cb(ret);
				});
			}
			else cb(localClass);
		},
		createClass:createClass,
		events:[],
		bindEvent:function(evt,cb) {
			doc.addEventListener(evt,cb,false);
		},
		triggerEvent:function(evtname,data,elm) {
			var evt = new Event(evtname);
			$.extend(evt,data);
			doc.dispatchEvent(evt);
		}
	};


	function createClass(name,parent,func) {
		var initdata = {};
		var newf = function() {
			var t = this;
			for(i in initdata) {
				t[i] = initdata[i];
			}
			if (t.preInit)
				t.preInit.apply(t,arguments);
			//console.trace(arguments,t);
			t.init.apply(t,arguments);
		};

		newf.prototype = new parent;
		newf.prototype.constructor = newf;
		newf.prototype.parent = parent.prototype;


		cav.classes[name] = newf;
		for(i in func) {
			var fnc = func[i];
			if (fnc.constructor == Function)
				newf.prototype[i] = fnc;
			else
				initdata[i] = fnc;
		}
		return newf;
	}


	var cavAtom = function() {
		
	}

	cavAtom.prototype.init = function() {

	}

	createClass('objecteditor',cavAtom, {
		init:function(opt) {
			var t = this;
			t.editors = {};
			t.settings = opt||{};
			t.ribbon = cav.ribbon;


			function findEditable(n) {
				var edt = n.data('editor');
				if (edt && edt.length) {
					return {
						id:n.attr('id'),
						editor:edt.split(' ')
					};
				}
				else {
					var prt = n.parent();
					if (prt.length && prt[0].nodeName!='body')
						return findEditable(prt);
				}
			}

			bdy.bind('click',function(e) {
				var n = findEditable($(e.target));
				if (n && n.editor) {
					var oldEditor = t.editors[n.id];
					if (oldEditor && oldEditor.handler)
					{
						oldEditor.handler.reinit();
						t.setCurrent(oldEditor);
					}
					else {
						t.loadEditor(n,function(edt) {
							n.handler = edt;
							t.editors[n.id] = n;
							t.setCurrent(n);
						});
					}
				}
			});
		},
		setCurrent:function(editor) {
			var t = this;
			function setCurr() {
				t.currentEditor = editor;
				t.showEditor(editor);
			} 
			if (t.currentEditor) {
				if (t.currentEditor.id != editor.id) {
					t.hideEditor(t.currentEditor);
					setCurr();
				}
			}
			else {
				setCurr();
			}
		},
		hideEditor:function(editor) {
			if (editor.handler)
				editor.handler.hide();
		},
		showEditor:function(editor) {
			if (editor.handler)
				editor.handler.show();
		},
		loadEditor:function(n,cb) {
			var t = this;
			var ed = t.editors[n.id];
			console.log('found editor',ed);
			if (ed)
				cb(ed);
			else {
				cav.getClass(n.editor[0],function(cls) {
					console.log('loaded',cls);
					cb(new cls(n));
				},function(err) {
					console.log(err);
				});
			}
		}
	});	

	createClass('baseeditor',cavAtom, {
		init:function(opt) {
			var t = this;
			t.items = [];
			if (opt) {
				t.node = $(opt.id);
				t.settings = opt||{};
		
				t.ribbon = cav.ribbon;
				console.log('init base editor');
				
				t.createGui();
			}
		},
		createGui:function() {
			var t = this;
			if (!t.customGui) {
				var nm = trans(t.editorName||'baseeditor');
				var mainMenu = t.manu = new cav.classes.menuitem({txt:nm});
				
				t.items.push(mainMenu);
				t.items.push(t.ribbon.addTab({txt:nm,autoopen:true}));
			}
		},
		reinit:function() {
			console.log('reinit base');
		},
		hide:function() {
			var items = this.items;
			for(var i in items)
			{
				items[i].hide();
			}
		},
		show:function() {
			console.log('show');
			var items = this.items;
			for(var i in items)
			{
				items[i].show();
			}
		}
	});


	var baseelm = createClass('baseelm',cavAtom,{
		init: function(opt) {
			var t = this;
			t._disabled = false;
			/*
			Object.defineProperty(t,'disabled',{
				get:function(){
					return t._disabled;
				},
				set:function(v) {
					if (t._disabled != v) {
						t._disabled = v;
						t.disabledUpdated();
					}
				}
			});*/
			t.items = [];
			t.settings = opt||{};
			t.create();
			if (opt && opt.items) {
				t.addItem(opt.items)
				delete opt.items;
			}
		},
		active:function(v) {
			var t = this;
			if (v!=undefined) {
				t._active = v;
				t.elm.toggleClass(t.activeClass,v);
			}
			return t._active;
		},
		disabled:function(v) {
			if (v!=undefined && v!=this._disabled) {
				this._disabled = v;
				this.disabledUpdated();
			}
		},
		hide:function() {
			var t = this;
			t._lastVisibleState = t.elm.is(':visible');
			t.elm.hide();
			if (t.hideChildren)
				t.hideChildren();
		},
		show:function() {
			var t = this;
			//if (t._lastVisibleState) {
				t.elm.show();
				if (t.unhideChildren)
					t.unhideChildren();
			//}
		},
		disabledUpdated:function() {
			cav.triggerEvent('wd-item-disabled', { item:this,disabled:this._disabled },this.elm[0]);
			this.elm.toggleClass('wd-disabled',this._disabled);
		},
		create: function() {
			var bindings = ['click','mouseup','mousedown','contextmenu','keyup','keypress','mouseenter','mouseleave'],
				t = this,
				s = this.settings;
			t.elm = $(t.html||'<div />').data('wditem',t);
			if (s.tooltip)
				t.elm.attr('title',s.tooltip);
			if (t.createInner)
				t.createInner();
			if (s) {
				for(i in bindings)
				{
					var b = bindings[i];
					var bfunc = s[b];
					if (bfunc) {
						(function(bf) {
							t.elm.bind(b,t,function() { 
							if (!t._disabled) 
								bf.apply(t,arguments);
							});
						})(bfunc);
					}
				}
			}
		},
		childContainer: function(itm) {
			return this.elm;
		},
		add: function(item) {
			var t = this;
			if (!item.elm)
			{
				if (t.defaultItemClass)
				{
					item = new cav.classes[t.defaultItemClass](item);
				}
				else 
					return {error:'no default class'};
			}
			item.parentNode = t;
			t.items.push(item);
			if (t.reversedAdd)
				item.elm.prependTo(t.childContainer(t));
			else 
				item.elm.appendTo(t.childContainer(t));
			cav.triggerEvent('wd-itemadded',item);
			if (t.afterAdded)
				t.afterAdded(item);
			if (item.afterCreated)
				item.afterCreated(t);
			return item;
		},
		addItem: function(items) {
			var t = this;
			return parseMulti(items,function(d) { return t.add(d); });
		}
	});

		
	createClass('notificationcenter',baseelm,{
		reversedAdd:true,
		html:'<div class="wd-notificationholder" />'
	});

	createClass('notification',baseelm,{
		html:'<div class="wd-notification" />',
		defaultTimeout:5000,
		close:function() {
			var t = this;
			t.elm.addClass('wd-hide');
			setTimeout(function() {
				t.elm.remove();	
			},500);
		},
		update:function(opt) {
			if (opt) {
				$.extend(this.settings,opt);
				this.applySettings();
			}
		},
		applySettings:function() {
			var t = this,
				s = t.settings,
				txt = trans(s.txt||t.defaultText);
			t.txtElm.text(txt);
			if (s.icon)
			{
				t.txtElm.find('i').remove();
				t.txtElm.prepend($('<i />').addClass('fa fa-'+iconMap(s.icon)));
			}
		},
		createInner:function() {
			var t = this,
				s = t.settings,
				txt = trans(s.txt||t.defaultText),
				to = s.timeout||t.defaultTimeout;
			if (!s.prom) {
				t.hideTimer = setTimeout(function() {
					t.close();
				},to);
			}
			t.txtElm = $('<span class="wd-item-label wd-notificationtext" />').appendTo(t.elm.click(function() {t.close();}));
			t.applySettings();
		}
	});
	
	createClass('menuitem',baseelm,{
		html:'<li class="wd-menuitem" />',
		activeClass:'wd-active',
		childContainer:function() {
			var ts = this.subelm;
			if (!ts) {
				this.subelm = ts = $('<ul class="wd-submenu" />').appendTo(this.elm.addClass('wd-hassub'));
			}
			return ts;
		},
		parent:function() {
			var t = this;
			if (t.parentNode)
				return t.parentNode.elm;
			return t.elm.parent().parent();
		},
		afterCreated:function() {
			var t = this;
			var s = t.settings;
			
			function stopProp(e) {
				e.stopPropagation();
				return false;
			}
			
			if (s.postrender) {
				s.postrender.apply(t);
			}
			if (s.textStyle) {
				s.textStyle.apply(t);
			}
			
			t.elm.bind('mouseenter',function() { console.log('show',t.elm[0]); t.elm.trigger('show');}).bind('mouseleave',function() { t.elm.trigger('hide');}).bind('mousedown',stopProp).bind('mouseup',stopProp);
		},
		createInner:function() {
			var t = this;
			var s = t.settings;
			
			if (s.isSeparator)
				t.elm.addClass('wd-separator');
			else if (s.customHTML)
			{
				this.elm.append(s.customHTML);
			}
			else {
				t.txtElm = $('<span class="wd-menu-label wd-item-label" />').text(trans(this.settings.txt,this.settings.defaultText)).appendTo(this.elm);
				if (s.icon)
				{
					t.txtElm.prepend($('<i />').addClass('fa fa-'+iconMap(s.icon)));
				}
			}			
		}
	});

	createClass('mainmenu',baseelm,{
		html:'<li class="wd-menuitem wd-mainmenu" />',
		toggleSub:function() {
			this.elm.toggleClass('wd-showflyout');
		},
		close:function() {
			this.elm.removeClass('wd-showflyout');	
		},
		open:function() {
			this.elm.addClass('wd-showflyout');
		},
		isOpen:function() {
			return this.elm.hasClass('wd-showflyout');
		},
		childContainer:function(i) {
			return this.subelm;
		},
		createInner:function() {
			var t = this;
			t.elm.append($('<span class="wd-menu-label wd-item-label" />').text(trans(this.settings.txt,this.settings.defaultText)));
			var fl = t.flyout = $('<div class="wd-mainflyout" />').appendTo(t.elm.click(function() {
				t.toggleSub();
			}));
			t.subelm = $('<ul class="wd-flyoutmenu" />').appendTo(fl);
			t.subcnt = $('<ul class="wd-flyoutcnt" />').appendTo(fl);
		}
	});

	createClass('tabgroup',baseelm,{
		html:'<div class="wd-tabgrp" />',
		preInit:function() {},
		createInner: function() {
			this.elm.append($('<span class="wd-tabgrp-label wd-item-label" />').text(trans(this.settings.txt,this.settings.defaultText)));
		}
	});

	$.fn.cancel = function() {};

	var btn = createClass('btn',baseelm,{
		html:'<div class="wd-button" />',
		activeClass:'wd-active',
		click:function() {
			if (!this._disabled)
				console.log('unhandled click');
		},
		createInner: function() {
			var t = this,
				s = t.settings;

			function prop(e) {
				e.stopPropagation();
				return false;
			}
			var subelm = $('<span class="wd-button-label wd-item-label" />');
			if (!s.notext)
				subelm.text(trans(t.settings.txt,t.settings.defaultText));
			t.elm.mousedown(prop).mouseup(prop);
			if (s.icon)
			{
				subelm.prepend($('<i />').addClass('fa fa-'+iconMap(s.icon)));
			}
			
			if (s.postrender)
				s.postrender.apply(t);
			
			t.elm.append(subelm).click(function(e) { t.click(e); });
		}
	});

	var inp = createClass('input',baseelm,{
		html:'<div class="wd-textinput wd-input" />',
		events:['focus','blur','change','keyup','keydown','keypress'],
		inptype:'text',
		change:function() {
			if (!this._disabled) {
				var s = this.settings;
				if (s.change) {
					s.change(this.getValue());
				}
				else 
					console.log('unhandled change',this);
			}
		},
		addValue:function(v) {
			(this.valueList||this.valueElm).append('<option value="'+v+'">'+v+'</option>');
		},
		addValues:function(d) {
			var t = this;
			$.each(d,function(i,v) {
				t.addValue(v);
			});
		},
		disabledUpdated:function() {
			var t = this;
			
			t.valueElm.attr('disabled',t._disabled?'disabled':null);
		},
		createInput:function() {
			return $('<input type="'+this.inptype+'" />');
		},
		setValue:function(v,triggerChange) {
			this.valueElm.val(v);
			console.log('inp set',v);
			if (triggerChange)
				this.valueElm.change();
		},
		getValue:function() {
			return this.valueElm.val();
		},
		createInner: function() {
			var t = this;
			var s = t.settings;
			function evtbind(e) {
				var fn = t[e.type];
				if (fn)
					fn.apply(t,arguments);
			}
			var uniq = 'winp' + (new Date()).getTime();
			t.elm.append($('<label class="wd-input-label wd-item-label" />').text(trans(s.txt,s.defaultText)));
			var v = t.valueElm = t.createInput().attr('placeholder',trans(s.placeholder,s.defaultText)).appendTo(t.elm);
			for(var i in t.events) {
				v.bind(t.events[i],evtbind);
			}
			var o = s.data;
			if (o) {
				v.attr('list',uniq);
				t.valueList = $('<datalist id="'+uniq+'" />').appendTo(t.elm);
				if (typeof(o) == 'function')
					o(t,function(r) {
						t.addValues(r);
					});
				else
					t.addValues(o);
			}
			if (s.defaultValue)
				v.val(s.defaultValue);
			if (t.afterCreated)
				t.afterCreated();
		}
	});

	createClass('selectbox',inp,{
		events:['focus','blur','change'],
		html:'<div class="wd-selecinput wd-input" />',
		addValue:function(v) {
			this.valueElm.append('<option>'+v+'</option>');
		},
		createInput:function() {
			var ret = $('<select />');
			var t = this;
			
			return ret;
		}
	});

	createClass('selector',inp,{
		events:['change'],
		selectedClass:'wd-selected',
		itemSelector:'wd-selector-item',
		html:'<div class="wd-selector wd-input" />',
		addValue:function(v) {
			var t = this;
			this.valueElm.append('<option>'+v+'</option>');
			$('<div class="'+t.itemSelector+'" />').data('value',v).click(function() {
				if (!t._disabled) {
					t.setSelectedItem(this);
				}
			}).text(v).appendTo(t.cnt);
		},
		setSelectedItem:function(itm) {
			var t = this;
			t.cnt.find('.'+t.selectedClass).not($(itm)).removeClass(t.selectedClass);
			var state = $(itm).toggleClass(t.selectedClass).hasClass(t.selectedClass);
			t.setValue($(itm).data('value'));
		},
		findValueElement:function(v) {
			var t = this;
			var ret;
			t.cnt.find('.'+t.itemSelector).each(function() {
				if ($(this).data('value')==v)
					ret = $(this);
			});
			return ret;
		},
		setValue:function(v) {
			var t = this;
			var velm = t.findValueElement(v);
			t.parent.setValue.apply(t,[v,true]);
			if (velm && !velm.hasClass(t.selectedClass))
				t.setSelectedItem(velm);
		},
		change:function() {
			this.parent.change.apply(this);
			//console.log('selector changed',this.getValue());
		},
		createInput:function() {
			var ret = $('<select />').hide();
			var t = this;
			if (t.settings.multiple)
				ret.attr('multiple','multiple');
			t.cnt = $('<div class="wd-selector-cnt" />').appendTo(t.elm);
			return ret;
		},

	});

	createClass('toggleButton',btn,{
		activeClass:'wd-sel-btn',
		html:'<div class="wd-button wd-tgl-btn" />',
		click:function() {
			var t = this,
				sett = t.settings,
				state = t.elm.toggleClass(t.activeClass).hasClass(t.activeClass),
				fnc = sett[state?'on':'off'];
			if (fnc)
				fnc();
			if (sett.change)
				sett.change(state);
		}
	});

	createClass('buttongroup',baseelm,{
		html:'<div class="wd-buttongroup cf" />',
		afterAdded:function(i) {

			//console.log('add',this.settings.data);
		}
	});

	createClass('splitbutton',btn,{
		html:'<div class="wd-button wd-splitbutton" />',
		afterAdded:function(i) {
			//console.log()
			//console.log('add',this.settings.data);
		}
	});

	createClass('menubutton',btn,{
		html:'<div class="wd-button wd-menubutton" />',
		childContainer:function() {
			var ts = this.subelm;
			/*var show = this.settings.show;
			if (show)
				console.log(show);*/
			if (!ts)
				this.subelm = ts = $('<ul class="wd-submenu" />').appendTo(this.elm);
			return ts;
		},
		afterAdded:function(i) {
			//console.log()
			//console.log('add',this.settings.data);
		}
	});

	

	createClass('tab',baseelm,{
		preInit:function(opt,rib) {
			//console.log(opt,rib);
			this.ribbon = rib;
			rib.tabs.push(this);
		},
		create:function() {
			var t = this;
			var s = t.settings;
			t.tabItem = $('<li class="wd-rib-tab" />').data('wditem',t).append($('<span class="wd-menu-label wd-item-label" />').click(function(e) {t.open();e.stopPropagation();return false;}).text(trans(this.settings.txt,this.settings.defaultText))).appendTo(t.ribbon.ribbonTabs);
			t.elm = $('<div />').appendTo(t.ribbon.ribbonHolder);
			s.created&&s.created();
			if (s.autoopen)
				this.open();
		},
		show:function() {
			var t = this;
			t.tabItem.show();	
			//t.elm.show();
			t.open();
		},
		hide:function() {
			var t = this;
			t.close();
			t.tabItem.hide();
		},
		open: function() {
			var t = this;
			var s = t.settings;
			var isOpen = t.isOpen;
			for(i in t.ribbon.tabs) {
				t.ribbon.tabs[i].close();
			}

			t.tabItem.addClass('selected');
			t.elm.addClass('open');
			if (!isOpen)
				s.onopen&&s.onopen();
			t.isOpen = true;
		},
		close: function() {
			var t = this;
			var s = t.settings;
			t.tabItem.removeClass('selected');
			t.elm.removeClass('open');
			if (t.isOpen)
				s.onclose&&s.onclose();	
			t.isOpen = false;
		}
	});


	var tab = cav.classes.tab; 
	var menuItem = cav.classes.menuitem;

	var ribbon = createClass('ribbon',cavAtom, {
		menuItems:[],
		tabs:[],
		init:function(opt) {
			var t = this;
			t.settings = opt;
			cav.bindEvent('wd-itemadded',function() {
				var h = t.root.outerHeight();
				bdy.css('margin-top',h);
			});
		},
		addMenu:function(d) {
			var t = this;
			return parseMulti(d,function(ret) {
				t.menuItems.push(ret);
				t.menu.append(ret.elm);
				if (ret.afterCreated)
					ret.afterCreated();
				return ret;
			});
		},
		create: function() {
			var t = this;
			var root = t.root = $('<section rule="ribboncontainer" class="wd-root wd-r" />').appendTo(bdy);
			var menu = t.menu = $('<ul rule="menu" class="wd-menu wd-li-left cf" />').appendTo(root);
			var ribbon = t.ribbonRoot = $('<section class="wd-ribbon cf" />').appendTo(root);
			var ribTabs = t.ribbonTabs = $('<ul class="wd-rib-tabs wd-li-left cf" />').appendTo(ribbon);
			var ribs = t.ribbonHolder = $('<section class="wd-rib cf" />').appendTo(ribbon);
			var not = t.notification = new cav.classes.notificationcenter({});
			not.elm.appendTo(bdy).addClass('wd-r');
			t.createBaseMenu();
			t.createBaseRibbon();
			t.initScroll();
			t.addNotification({txt:'readytoedit'});
			t.editor = new cav.classes.objecteditor({ribbon:t});
		},
		addNotification:function(opt) {
			var not = new cav.classes.notification(opt);
			this.notification.addItem(not);
			return not;
		},
		initScroll: function() {
			var t = this;
			t.lastScroll = 0;
			var root = t.root;
			function removeScroll() {
				root.removeClass('wd-scrolled');
			}
			t.root.mouseenter(removeScroll);
			$(w).scroll(function(e) {
				var wh = $(this).scrollTop();
				if (t.scrollTimer)
					clearTimeout(t.scrollTimer)
				var isScroll = (t.lastScroll<wh && wh>150);
				if (isScroll)
					t.scrollTimer = setTimeout(removeScroll,globalSettings.scrollTimeout);
				root.toggleClass('wd-scrolled',isScroll);
				t.lastScroll = wh;
			});
		},
		createBaseRibbon: function() {
			/// Temporary
			var tabgroup = cav.classes.tabgroup;
			var tabbtn = cav.classes.btn;
			var tp = this.addTab({txt:'tab_page',onopen:function() {
				console.log('öppna tab_page');
			}});
			var regbtn = new tabbtn({txt:'btn1'});
			var tbtn = new cav.classes.toggleButton({txt:'tbtn1',change:function(st) {
				regbtn.disabled(st);
				tinp.disabled(st);
			}});
			var tinp = new inp({txt:'btn1',defaultValue:'kalle',data:function(sel,cb) { 
							console.log('dfdfd',arguments);
							cb(['sklep2','sklop3']);
						}});

			tp.addItem([
				new tabgroup({txt:'grp1',items:[
					regbtn,
					tbtn,
					new tabbtn({txt:'btn2'})
				]}),
				new tabgroup({text:'grp2',items:[
					tinp,
					new cav.classes.toggleButton({txt:'tbtn1'})
				]})
			]);
			var tt = this.addTab({txt:'tab_tools',autoopen:1});
			tt.addItem([
				new tabgroup({txt:'grp3',items:[
					new cav.classes.selector({
						txt:'select',
						change:function() {
							console.log('bound change',arguments);
						},
						data:['a','b','c','d']
					}),
					new cav.classes.selectbox({
						txt:'selasync',
						data:function(sel,cb) { 
							console.log('dfdfd',arguments);
							cb(['sklep2','sklop3']);
						}}
					)
				]})
			]);
		},
		createBaseMenu: function() {
			var m = this.addMenu([
				new cav.classes.mainmenu({txt:'main',items:[
					new menuItem({
						txt:'logout',
						items:[new menuItem({txt:'sub logout'})],
						click:function() {
							alert('logout');
						}})
				]}),
				new menuItem({txt:'file',items:[
					new menuItem({
						txt:'logout',
						items:[new menuItem({txt:'sub logout'})],
						click:function() {
							alert('logout');
						}})
				]}),
				new menuItem({txt:'page',items:[
					new menuItem({
						txt:'publish',
						click:function() {
							alert('publish');
						}})
					]}),
				new menuItem({txt:'settings',items:[
					new menuItem({
						txt:'logout',
						items:[new menuItem({txt:'sub logout'})],
						click:function() {
							alert('logout');
						}})
				]})
			]);			
		},
		addTab: function(d) {
			var t = this;
			return parseMulti(d,function(opt) {
				return new tab(opt,t);
			});
		}
	});
	cav.ribbon = new ribbon();
	
	
})(window,window.document,jQuery);fd('ribbon.js')