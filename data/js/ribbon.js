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


	var cav = {
		classes : {}
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
		this.init.apply(this,arguments);
	}

	cavAtom.prototype.init = function() {
		console.log('atom init');
	}

	var baseelm = createClass('baseelm',cavAtom,{
		init: function(opt) {
			var t = this;
			t.disabled = false;
			t.items = [];
			t.settings = opt||{};
			t.create();
			if (opt && opt.items) {
				t.addItem(opt.items)
				delete opt.items;
			}
		},
		create: function() {
			var bindings = ['click','mouseup','mousedown','contextmenu','keyup','keypress','mouseenter','mouseleave'],
				t = this,
				s = this.settings;
			t.elm = $(t.html||'<div />').data('wditem',t);
			if (t.createInner)
				t.createInner();
			if (s) {
				for(i in bindings)
				{
					var b = bindings[i];
					var bf = s[b];
					if (bf)
						t.elm.bind(b,t,bf);
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
			t.items.push(item);
			item.elm.appendTo(t.childContainer(t));
			return item;
		},
		addItem: function(items) {
			var t = this;
			return parseMulti(items,function(d) { return t.add(d); });
		}
	});

	

	
	createClass('menuitem',baseelm,{
		html:'<li class="wd-menuitem" />',
		childContainer:function() {
			var ts = this.subelm;
			if (!ts)
				ts = $('<ul class="wd-submenu" />').appendTo(this.elm);
			return ts;
		},
		createInner:function() {
			this.elm.append($('<span class="wd-menu-label wd-item-label" />').text(trans(this.settings.txt,this.settings.defaultText)));
		}
	});

	createClass('tabgroup',baseelm,{
		html:'<div class="wd-tabgrp" />',
		preInit:function() {},
		createInner: function() {
			this.elm.append($('<span class="wd-tabgrp-label wd-item-label" />').text(trans(this.settings.txt,this.settings.defaultText)));
		}
	});

	var btn = createClass('btn',baseelm,{
		html:'<div class="wd-button" />',
		click:function() {
			console.log('unhandled click');
		},
		createInner: function() {
			var t = this;
			t.elm.append($('<span class="wd-button-label wd-item-label" />').text(trans(t.settings.txt,t.settings.defaultText))).click(function(e) { t.click(e); });
		}
	});

	var inp = createClass('input',baseelm,{
		html:'<div class="wd-textinput wd-input" />',
		events:['focus','blur','change','keyup','keydown','keypress'],
		inptype:'text',
		change:function() {
			var s = this.settings;
			if (s.change) {
				s.change();
			}
			else 
				console.log('unhandled change',this);
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
		createInput:function() {
			return $('<input type="'+this.inptype+'" />');
		},
		setValue:function(v,triggerChange) {
			this.valueElm.val(v);
			if (triggerChange)
				this.valueElm.change();
		},
		getValue:function() {
			return this.valueElm.val(v);
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
				sett.change(st);
		}
	});

	createClass('tab',baseelm,{
		preInit:function(opt,rib) {
			console.log(opt,rib);
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
			this.settings = opt;
		},
		addMenu:function(d) {
			var t = this;
			return parseMulti(d,function(ret) {
				t.menuItems.push(ret);
				t.menu.append(ret.elm);
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
			t.createBaseMenu();
			t.createBaseRibbon();
			t.initScroll();
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
				var isScroll = (t.lastScroll<wh);
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
			var tp = this.addTab({txt:'tab_page',autoopen:1,onopen:function() {
				console.log('öppna tab_page');
			}});
			tp.addItem([
				new tabgroup({txt:'grp1',items:[
					new tabbtn({txt:'btn1'}),
					new cav.classes.toggleButton({txt:'tbtn1'}),
					new tabbtn({txt:'btn2'})
				]}),
				new tabgroup({text:'grp2',items:[
					new inp({txt:'btn1',defaultValue:'kalle',data:function(sel,cb) { 
							console.log('dfdfd',arguments);
							cb(['sklep2','sklop3']);
						}}),
					new cav.classes.toggleButton({txt:'tbtn1'})
				]})
			]);
			var tt = this.addTab({txt:'tab_tools'});
			tt.addItem([
				new tabgroup({txt:'grp3',items:[
					new cav.classes.selectbox({
						txt:'sel1',
						data:['sklep','sklop']
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

	//Expose root object
	w.cavcms = {
		ribbon: new ribbon()
	};


})(window,window.document,jQuery);fd('ribbon.js')