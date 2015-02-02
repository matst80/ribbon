cav.createClass('richedit',cav.classes.baseeditor,{
	customGui:true,
	editorName:'richedit',
	createGui:function() {
		tinymce.init({
		    selector: "#"+this.settings.id,
		    editorReference:this,
		    inline: true,
		    relative_urls:true,
		    plugins: [
		        "advlist autolink lists link image anchor",
		        "searchreplace visualblocks code fullscreen",
		        "media table contextmenu paste cavsave"
		    ],
		    external_plugins: {
		        "cavsave": "/js/tinymce/plugins/cavsave/plugin.js"
		    },
			skin_url: '/js/tinymce/skins/cav8',
			theme:'cavagent',
			language:'sv_SE',
		    language_url:'/js/tinymce/langs/sv_SE.js',
			theme_url: '/js/tinymce/themes/cavagent/theme.js'
		});
	}
});

window.fd&&fd('cls_richedit.js');