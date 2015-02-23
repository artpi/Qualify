window.ziom = [];
var qNote = {
	guidCache: [], //wrap in jquery to provide events.
	currentNote: {},
	currentNoteData: {
		currentHighlight: null,
		highlights: [],
		tags: {}
	},
	noteQuery: {
		notebook: '',
		tag: '',
		words: ''
	},
	getGuid: function(method,guid, callback) {
		if(typeof qNote.guidCache[guid] === 'object' ) {
			callback(qNote.guidCache[guid]);
		} else {
			$(document).one(guid, function() {
				callback(qNote.guidCache[guid]);
			});
			if(typeof qNote.guidCache[guid] === 'undefined') {
				jQuery.getJSON('index.php?a='+method+'&guid='+ guid, function(response) {
					//Cache of objects.
					qNote.guidCache[guid] = response;
					$(document).trigger(guid);
				});
			}
			qNote.guidCache[guid] = 1;
		}
	},
	addTag: function(e) {
		if(qNote.currentNoteData.currentHighlight) {
			$("#annotator-field-1").val(qNote.currentNoteData.currentHighlight);
		}
	},
	annotationHighlight: function(tag, opacity) {
		for(var i=0; i<qNote.currentNoteData.tags[tag].notes.length; i++) {
			var note = qNote.currentNoteData.tags[tag].notes[i];
			for(var j=0; j<note.highlights.length; j++) { 
				$(note.highlights[j]).css('background',ui.highlightColor.get(tag, opacity));
			}
		}
	},
	annotationProcess: function(ann) {
		for(var i=0; i<ann.length; i++) {
			var tag = false;
			qNote.currentNoteData.highlights.push(ann[i]);
			$.each(ann[i].tags, function(index, tag) {
				if(qNote.currentNoteData.tags[tag]) {
					qNote.currentNoteData.tags[tag].notes.push(ann[i]);
					qNote.currentNoteData.tags[tag].$el.find('.badge').text(qNote.currentNoteData.tags[tag].notes.length);
				} else {
					var l = Object.keys(qNote.currentNoteData.tags).length;
					qNote.currentNoteData.tags[tag] = {notes: new Array(ann[i]), $el: null, color: ui.highlightColor.get(tag,'0.3')};
					qNote.currentNoteData.tags[tag].$el = $('<li><a>'+tag+' <span class="badge" style="background:'+qNote.currentNoteData.tags[tag].color+'">1</span></a></li>');
					qNote.currentNoteData.tags[tag].$el.appendTo($("#note .tag_list"));
					qNote.currentNoteData.tags[tag].$el.on('click', function() {

						if(qNote.currentNoteData.currentHighlight === tag) {
							qNote.annotationHighlight(qNote.currentNoteData.currentHighlight, "0.3");
							//$("#note ul.tag_list>li").removeClass('active');
							$("#note ul.tag_list>li>a").css('background', '');
							qNote.currentNoteData.currentHighlight = null;
							
						}
						else if(qNote.currentNoteData.currentHighlight) {
							qNote.annotationHighlight(qNote.currentNoteData.currentHighlight, "0.3");
							$("#note ul.tag_list>li>a").css('background', '');
							qNote.currentNoteData.tags[tag].$el.find('a').css('background',qNote.currentNoteData.tags[tag].color);
							qNote.currentNoteData.currentHighlight = tag;
							qNote.annotationHighlight(tag, "0.6");
						}
						else {
							//qNote.currentNoteData.tags[tag].$el.addClass('active');
							qNote.currentNoteData.tags[tag].$el.find('a').css('background',qNote.currentNoteData.tags[tag].color);
							qNote.currentNoteData.currentHighlight = tag;
							qNote.annotationHighlight(tag, "0.6");
						}
						
						
					});
				}
				
				for(var j=0; j<ann[i].highlights.length; j++) { 
					$(ann[i].highlights[j]).css('background',qNote.currentNoteData.tags[tag].color );
				}
			
			});
		
		}
	

	},
	processNote: function(res) {
		var json = res.content.match(/<pre[^>]+>qNote:{([\s\S]+)}<\/pre>/im);
		if(json) {
			var info = jQuery.parseJSON("{" + json[1].replace(/&quot;/g,'"') +  "}");
			//Proper tags			
			
			//TODO: Add deferred to tags!
			//qNote.getGuid('getTag', val.guid, function(resTags) {});;
			if(res.tagGuids) {
				var tags=[];
				for(var i=0; i<res.tagGuids.length;i++) {
					if(qNote.guidCache[res.tagGuids[i]]) {
						tags.push(qNote.guidCache[res.tagGuids[i]].name);
					} else {
						break;
					}
				}
				//debugger;
				if(tags.length === res.tagGuids.length) {
					info.a.tags = tags;
					//debugger;
				}
			}
			
			//Text editing
			var text = res.content.match(/<h3[^>]*?>qNote start<\/h3>([\s\S]+)<h3[^>]*?>qNote end<\/h3>/im);
			if(text) {
				info.a.text = text[1].replace(/<\/div>/ig,"\r\n").replace(/<[^>]+>/ig,"");
			}
			info.a.links = [
				{
				   target: '_blank',
				   rel: 'alternate',
				   href: qNote.noteLinkUrl(res),
				   type: 'text/html'
				 }
			   ];
			return info;
		} else {
			return false;
		}
	},
	getAnnotations: function() {
		var note = qNote.currentNote;
		qNote.tagCache = [];
		jQuery.getJSON('index.php?a=listNotes&words=' +note.guid, function(annotations) {
			jQuery.each(annotations,function(i, val) {
				qNote.getGuid('getNote',val.guid, function(res) {
					var info = qNote.processNote(res);
					if(info) {
						annotatorInstance.loadAnnotations([info.a]);
//						qNote.annotationProcess(info.a);
					}
				});
			});
		});
	},
	noteLinkUrl: function(note) {
		return webClientUrl + "Home.action#st=p&n=" + note.guid;
	},
	makeNote: function(annotation) {
	
		var req = {
			a: annotation, 
			qNoteParentId:qNote.currentNote.guid,
			qNoteParentTitle: qNote.currentNote.title
		}
		
		$.post( "index.php", { a: 'makeAnnotation', data: JSON.stringify(req) }, function(res) {
			//TODO: Add some behaviour.
		});
		
	},
	showNote: function(guid, callback) {
	$("#note").html("<div class='loading'></div>");
		qNote.getGuid('getNote',guid, function(note) {
			qNote.currentNote = note;
			$("#note").html('<h2>' +note.title+ '</h2>' +
				'<div class="btn-group btn-group-justified">' +
				'<a href="'+note.dLink+'" target="_blank" class="btn btn-default">Open in Evernote Desktop</a>'+
				'<a href="'+qNote.noteLinkUrl(note)+'" target="_blank" class="btn btn-default">Open in Evernote Web</a>'+
				'<a href="'+webClientUrl+'Home.action#x='+note.guid+'" target="_blank" class="btn btn-default">Annotations in Evernote Web</a>' +
				'</div>'+ 
				'<ul class="nav nav-pills tag_list"></ul>'+
				note.content);
				
			qNote.getAnnotations();
			$("#note_content").annotator()
			.annotator('addPlugin', 'Tags')
			.annotator('addPlugin', 'qNoteAnnotator');
		});
	},
	listNotes: function() {
		ui.clearNotes();
		jQuery.getJSON('index.php?a=listNotes&notebookGuid=' + qNote.noteQuery.notebook + '&tagGuid=' + qNote.noteQuery.tag + '&words=' + qNote.noteQuery.words, function(notes) {
			$("#choose .note_list").empty();
			jQuery.each(notes,function(i, val) {
				ui.addNote(val);
			});
		});
	},
	listNotebooks: function () {
		jQuery.getJSON('index.php?a=listNotebooks', function(notebooks) {
			notebooks.sort(function(a,b) {
				if(a.name > b.name) {
					return 1;
				} else if(a.name<b.name) {
					return -1;
				} else {
					return 0;
				}
			});
			
			jQuery.each(notebooks,function(i, val) {
				if(!qNote.guidCache[val.guid]) {
					qNote.guidCache[val.guid] = val;
				}
				ui.addNotebook(val);
			});
		});
	},
	processTags : function(tags) {
		var tmp,
			cache = [],
			map = [],
			obj;
			
		// tags.sort(function(a,b) {
			// if(a.name > b.name) {
				// return 1;
			// } else if(a.name<b.name) {
				// return -1;
			// } else {
				// return 0;
			// }
		// });
		
		function sort(a,b) {
			var first, second;
			
			if(a.o) {
				first = '' + a.o.name;
			} else if(qNote.guidCache[a.guid]) {
				first = '' + qNote.guidCache[a.guid].name;
			} else {
				first = 'a';
			}
			
			if(b.o) {
				second = '' + b.o.name;
			} else if(qNote.guidCache[b.guid]) {
				second = '' + qNote.guidCache[b.guid].name;
			} else {
				second = 'a';
			}
			
			if (first > second) {
				return 1;
			} else if(second < first) {
				return -1;
			} else {
				return 0;
			}
		}
		
		for(var i=0; i<tags.length;i++) {
			if(!qNote.guidCache[tags[i].guid]) {
				qNote.guidCache[tags[i].guid] = tags[i];
			}
				
			if (map[tags[i].guid]) {
				obj = map[tags[i].guid];
				obj.o = tags[i];
				if(obj.o.parent && cache[obj.o.parent]) {
					tmp = cache.indexOf(obj.o);
					cache.splice(tmp,1);
				}
			} else {
				obj = {guid:tags[i].guid ,o: tags[i], children: []};
				map[tags[i].guid] = obj;
			}
			
			if(tags[i].parent) {
				if(!map[tags[i].parent]) {
					map[tags[i].parent] = {guid: tags[i].parent,o:null,children:[]}
					cache.push(map[tags[i].parent]);
				}
				map[tags[i].parent].children.push(obj);
				map[tags[i].parent].children.sort(sort);
			} else {
				cache.push(obj);
			}
		}
		//cache.sort(sort);
		return cache;
	},
	listCodes: function () {
		jQuery.getJSON('index.php?a=listCodes', function(tags) {
			var tree = qNote.processTags(tags);
			function tagInsert(node, padding) {
				var click = true;
				if(!node.o) {
					click = false;
					node.o = qNote.guidCache[node.guid];
				}
				
				var el = $("<li data-guid='"+node.o.guid+"'><a>"+node.o.name+"</a></li>")
				.css('padding-left',padding + 'px')
				.appendTo($("#menu .code_list"));
				
				if(click) {
					el.on('click',function() {
						qNote.annotationGridTag(node.o.guid);
					});
				}
				
				for(var i=0; i<node.children.length;i++) {
					tagInsert(node.children[i], padding+15);
				}
			};
			
			for(var i=0; i<tree.length;i++) {
				tagInsert(tree[i],15);
			}
		
		});
	},
	listTags: function () {
		jQuery.getJSON('index.php?a=listTags', function(tags) {
			var tree = qNote.processTags(tags);
			
			function tagInsert(node, padding) {
				$('<a class="list-group-item" data-guid="'+node.o.guid+'">' +node.o.name+ '</a>').on('click',function() {
					qNote.noteQuery.tag = node.o.guid;
					qNote.listNotes();
				})
				.css('padding-left',padding + 'px')
				.appendTo($("#choose .tag_list"));
				
				$("<li data-guid='"+node.o.guid+"'><a>"+node.o.name+"</a></li>").on('click',function() {
					$('#choose>.panel-body').show();
					qNote.noteQuery.tag = node.o.guid;
					qNote.listNotes();
				})
				.css('padding-left',padding + 'px')
				.appendTo($("#menu .tag_list"));
				
				for(var i=0; i<node.children.length;i++) {
					tagInsert(node.children[i], padding+15);
				}
			};
			
			for(var i=0; i<tree.length;i++) {
				tagInsert(tree[i],15);
			}
						
		});
	},
	annotationGridTag: function(tagGuid) {
		var el = $(ui.addGrid());
		qNote.getGuid('getTag',tagGuid, function(tag) {
			el.find(".panel-title i").text(tag.name);
			jQuery.getJSON('index.php?a=listNotes&notebookGuid=&tagGuid='+tagGuid+'&words=', function(notes) {
				jQuery.each(notes,function(i, val) {
					qNote.getGuid('getNote',val.guid, function(res) {
						var info = qNote.processNote(res);
						qNote.getGuid('getNote',info.qNoteParentId, function(parent) {
							el.find('TBODY').append("<tr><td><a href='qNote.htm#n="+parent.guid+"'>"+parent.title+"</a></td><td>"+info.a.quote+"</td><td>"+info.a.text+"</td><td>"+info.a.tags.join(", ")+"</td></tr>");
						});
					})
				});
			});
		});
	}
};