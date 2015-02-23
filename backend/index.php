<?php
use EDAM\Types\Data, EDAM\Types\Note, EDAM\Types\Resource, EDAM\Types\ResourceAttributes;
use EDAM\Error\EDAMUserException, EDAM\Error\EDAMErrorCode;
use Evernote\Client;

try {
	$client = new Evernote\Client(array(
		'token' => $_SESSION['evernote']['oauth_token'],
		'sandbox' => SANDBOX
	));
	$noteStore = $client->getNoteStore();
} catch(Exception $e) {
	if($e->errorCode == 8) {
		unset($_SESSION['evernote']);
		header("HTTP/1.1 401 Invalid token");
		die("Please log in");
	}
}

function getNoteLink($guid) {
	global $_SESSION;
	return "evernote:///view/".$_SESSION['evernote']['edam_userId']."/".$_SESSION['evernote']['edam_shard']."/".$guid."/".$guid."/";
}


if(isset($_GET['a']) && $_GET['a'] == 'listNotebooks') {

	$notebooks = $noteStore->listNotebooks();

	$res=array();
	for($i=0; $i< count($notebooks); $i++) {
		$res[]=array(
			'guid' => $notebooks[$i]->guid,
			'name' => $notebooks[$i]->name
		);
	}
	print(json_encode($res));
} elseif(isset($_GET['a']) && $_GET['a'] == 'listNotes') {
	$filter = new \EDAM\NoteStore\NoteFilter();
	$filter->ascending = false;
	$filter->order = $GLOBALS['\EDAM\Types\E_NoteSortOrder']['UPDATED'];
	if(isset($_GET['notebookGuid']) && strlen($_GET['notebookGuid'])>3) { //TODO regex
		$filter->notebookGuid = $_GET['notebookGuid'];
	}
	
	if(isset($_GET['words']) && strlen($_GET['words'])>3) { //TODO regex
		$filter->words = $_GET['words'];
	}
	
	if(isset($_GET['tagGuid']) && strlen($_GET['tagGuid'])>3) { //TODO regex
		$filter->tagGuids = array($_GET['tagGuid']);
	}

	$n = $client->getNoteStore()->findNotes($filter, 0, 100);
	
	$res = array();
	for($i=0; $i<count($n->notes); $i++) {
		$excerpt = '';
		$res[]=array(
			'guid' => $n->notes[$i]->guid,
			'title' => $n->notes[$i]->title
		);
	}
	print(json_encode($res));
} 
elseif(isset($_GET['a']) && $_GET['a'] == 'getNote') { // TODO regex
	$n = $client->getNoteStore()->getNote($_GET['guid'],true,false,true,true);
	if(preg_match("/<en-note([\s\S]*?)>([\s\S]+)<\/en-note>/im", $n->content, $result)) {
		//media
		$media = array();
		//Index media and save recognition data.
		for($i=0;$i<count($n->resources);$i++) {
			if($n->resources[$i]->recognition !== null) {
				if(preg_match('#<recoIndex[^>]+objID="([a-z0-9]+)"[^>]+>(.+)<\/recoIndex>#is',$n->resources[$i]->recognition->body,$re)) {
					if(strlen($re[2]) > 4) {
						// x="([0-9]+)" y="([0-9]+)" w="([0-9]+)" h="([0-9]+)"
						$text = preg_replace('#<item[^>]+>\s*?<t[^>]+>([^<]+)</t>(<t[^>]+>[^<]+</t>)*?</item>#i',"<span>\\1</span> ",$re[2]);
						//print($re[2]);
						$media[$re[1]] = "<div class='scan' style='width:".$n->resources[$i]->width."px;height:".$n->resources[$i]->height."px'>".$text."</div>";
					}
				}
			}
		}
		
		function parseMedia($match) {
			global $media;
			preg_match_all('#(hash|type|align|alt|height|widthstyle|title)="([^"]+)"#is', $match[1], $map);

			$m = array();
			for($i=0;$i<count($map[1]);$i++) {
				$m[$map[1][$i]]=$map[2][$i];
			}
			if(isset($media[$m['hash']])) {
				return $media[$m['hash']];
			} else {
				unset($m['hash']);
				$text = $m['type'];
				unset($m['type']);
				if(isset($m['alt'])) {
					$text = $text.": ".$m['alt'];
				}
				unset($m['alt']);
				$params = array('class="media"');
				while (list($key, $val) = each($m)) { 
					$params[]=$key."=".'"'.$val.'"';
				}
				
				return '<div '.implode(" ",$params).'>'.$text.'</div>';
			}
		}
		
		$result[2] = preg_replace_callback("/<en-media([^>]+)>/i",'parseMedia',$result[2]);
		$result[2] = str_replace("</en-media>","",$result[2]);
		$inside = "<div id='note_content'".$result[1].">".$result[2]."</div>";
		$res=array(
			'guid' => $n->guid,
			'title' => $n->title,
			'content' => $inside,
			'tagGuids' => $n->tagGuids,
			'dLink' => getNoteLink($n->guid)
		);
	}
	print(json_encode($res));

}
elseif(isset($_GET['a']) && $_GET['a'] == 'getTag') {
	$t = $client->getNoteStore()->getTag($_GET['guid']);
	$res=array(
		'guid' => $t->guid,
		'name' => $t->name,
		'parent' => $t->parentGuid
	);
	
	print(json_encode($res));
}
elseif(isset($_GET['a']) && $_GET['a'] == 'listTags') {
	$t = $client->getNoteStore()->listTags();
	$res=array();
	for($i=0; $i<count($t); $i++) {
		$res[]=array(
			'guid' => $t[$i]->guid,
			'name' => $t[$i]->name,
			'parent' => $t[$i]->parentGuid
		);
	}

	print(json_encode($res));
}
elseif(isset($_GET['a']) && $_GET['a'] == 'listCodes') {
	$t = $client->getNoteStore()->listTagsByNotebook($_SESSION['evernote']['defaultNotebook']);
	$res=array();
	for($i=0; $i<count($t); $i++) {
		$res[]=array(
			'guid' => $t[$i]->guid,
			'name' => $t[$i]->name,
			'parent' => $t[$i]->parentGuid
		);
	}

	print(json_encode($res));
}
elseif(isset($_POST['a']) && $_POST['a'] == 'makeAnnotation') {
	$data = json_decode($_POST['data']);
	$title = $data->qNoteParentTitle;
	
	$noteLink = getNoteLink($data->qNoteParentId);
	
	unset($data->qNoteParentTitle);
	$json = str_replace('"','&quot;',json_encode($data));
	
	$nBody = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
	$nBody .= "<!DOCTYPE en-note SYSTEM \"http://xml.evernote.com/pub/enml2.dtd\">";
	$nBody .= "<en-note style='background-color:e5ebee'>";
	$nBody .= "<div>Original Note: <a href='".$noteLink."'>".$title."</a></div>";
	$nBody .= "<blockquote>".$data->a->quote."</blockquote>";
	$nBody .= "<h3>qNote start</h3>".$data->a->text."<h3>qNote end</h3>";
	$nBody .= "<pre style='display:none'>qNote:".$json."</pre>";
	$nBody .= "</en-note>";

	$ourNote = new Note();
	
	if(strlen($data->a->text) > 30) {
		$ourNote->title = substr($data->a->text, 0,30)."...";
	}
	else if(strlen($data->a->text) > 0) {
		$ourNote->title = $data->a->text;
	}
	else if(strlen($data->a->quote) > 30) {
		$ourNote->title = substr($data->a->quote, 0,30)."...";
	} 
	else {
		$ourNote->title = $data->a->quote;
	}
		
    
	$ourNote->content = $nBody;
	
	for($i=0;$i<count($data->a->tags);$i++) {
		$ourNote->tagNames[]= str_replace( array( '\'', '"', ',' , ';', '<', '>' ), '', $data->a->tags[$i]);
	}
	
 
    // parentNotebook is optional; if omitted, default notebook is used
	//TODO regex
    if (isset($_SESSION['evernote']['defaultNotebook']) && strlen($_SESSION['evernote']['defaultNotebook']) > 3) {
        $ourNote->notebookGuid = $_SESSION['evernote']['defaultNotebook'];
    }
 
    //Attempt to create note in Evernote account
    try {
        $note = $noteStore->createNote($ourNote);
		$res = array(
			'title' => $note->title,
			'guid' => $note->guid
		);
		print(json_encode($res));
		
    } catch (EDAMUserException $edue) {
        // Something was wrong with the note data
        // See EDAMErrorCode enumeration for error code explanation
        // http://dev.evernote.com/documentation/reference/Errors.html#Enum_EDAMErrorCode
        print "EDAMUserException: " . $edue;
    } catch (EDAMNotFoundException $ednfe) {
        // Parent Notebook GUID doesn't correspond to an actual notebook
        print "EDAMNotFoundException: Invalid parent notebook GUID";
    }
 
}


?>