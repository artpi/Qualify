<?php

require 'config.php';

session_start();

use EDAM\Types\Data, EDAM\Types\Note, EDAM\Types\Notebook, EDAM\Types\Resource, EDAM\Types\ResourceAttributes;
use EDAM\Error\EDAMUserException, EDAM\Error\EDAMErrorCode;
use Evernote\Client;

ini_set("include_path", ini_get("include_path") . PATH_SEPARATOR . "./backend/evernote-php-sdk/lib" . PATH_SEPARATOR);
require_once 'autoload.php';

require_once 'Evernote/Client.php';

require_once 'packages/Errors/Errors_types.php';
require_once 'packages/Types/Types_types.php';
require_once 'packages/Limits/Limits_constants.php';

$db = new PDO(DB, DB_USER, DB_PASS);


function getToken() {
	global $db, $_SESSION;
	$r = $db->query("SELECT * FROM evernote_sessions WHERE user_id='".$_SESSION['user_id']."';");
	//AND edam_expires>'".(time()*1000)."'
	//TODO czas
	$res = $r->fetchAll(PDO::FETCH_ASSOC);
	if(isset($res[0])) {
		if(!isset($res[0]['defaultNotebook']) || strlen($res[0]['defaultNotebook']) < 3 ) { //TODO regex
			$client = new Evernote\Client(array(
				'token' => $res[0]['oauth_token'],
				'sandbox' => SANDBOX
			));
			$noteStore = $client->getNoteStore();
			
			$dn = false;
			//no default notebook. Need create or find.
			//Lets find!
				$notebooks = $noteStore->listNotebooks();
				for($i=0; $i< count($notebooks); $i++) {
					if($notebooks[$i]->name == "Qualify") {
						$dn = $notebooks[$i]->guid;
						break;
					}
				}
				
				if(!$dn) {
					$notebook = new Notebook();
					$notebook->name="Qualify";
					$notebook = $noteStore->createNotebook($notebook);
					$dn = $notebook->guid;
				} else {
					//TODO sprawdzenie czy istnieje
				}
				
				
				$res[0]['defaultNotebook'] = $dn;
				$db->query("UPDATE evernote_sessions SET defaultNotebook = '".$dn."' WHERE id = '".$res[0]['id']."';");
		}
		
		$_SESSION['evernote']= $res[0];
		return $res[0];
	} else {
		return false;
	}
}

if(isset($_REQUEST['a'])) {
	if(isset($_SESSION['user_id']) && isset($_SESSION['evernote'])) {
		//print_r(new Note());
		include('backend/index.php');
	} else {
		header("HTTP/1.1 401 No session");
		die("Please log in");
		return false;
	} 
}
elseif(isset($_REQUEST['e']) && $_REQUEST['e'] == 'login') {
	$stmt = $db->query("SELECT id, email FROM users WHERE email='".$_REQUEST['login']."' AND pass=MD5(CONCAT('qnote', '".$_REQUEST['pass']."'));");
	$res = $stmt->fetchAll(PDO::FETCH_ASSOC);
	if(isset($res[0]) && $res[0]['email'] === $_REQUEST['login']) {
		$_SESSION['user_id'] = $res[0]['id'];
		header("HTTP/1.1 201 OK");
	} else {
		header("HTTP/1.1 202 Invalid login/password");
	}
}
elseif(isset($_REQUEST['e']) && $_REQUEST['e'] == 'register') {
	$stmt = $db->query("SELECT COUNT(id) AS c FROM users WHERE email='".$_REQUEST['login']."';");
	$res = $stmt->fetchAll(PDO::FETCH_ASSOC);
	if($res[0]['c'] == "0") {
		$stmt = $db->query("INSERT INTO users SET email='".$_REQUEST['login']."', pass=MD5(CONCAT('qnote', '".$_REQUEST['pass']."'));");
		$_SESSION['user_id'] = $db->lastInsertId();
		header("HTTP/1.1 201 OK");
		//print($db->lastInsertId());
	} else {
		header("HTTP/1.1 202 Login already taken!");
	}
}
else if(!isset($_SESSION['user_id'])) {
	//need log in
	header("Location: ./login.htm");
}
else if(isset($_SESSION['evernote']) || (getToken())) {
	//logged in and has token. Everything ok.
	header("Location: ./qNote.htm");
}
else if(!isset($_SESSION['evernote']) && isset($_GET['e']) && $_GET['e'] === 'oauth_callback') {
	//Callback from evernote.
	if (isset($_GET['oauth_verifier'])) {
		$_SESSION['oauthVerifier'] = $_GET['oauth_verifier'];
		$currentStatus = 'Content owner authorized the temporary credentials';

		try {
            $client = new Client(array(
                'consumerKey' => OAUTH_CONSUMER_KEY,
                'consumerSecret' => OAUTH_CONSUMER_SECRET,
                'sandbox' => SANDBOX
            ));
            $accessTokenInfo = $client->getAccessToken($_SESSION['requestToken'], $_SESSION['requestTokenSecret'], $_SESSION['oauthVerifier']);
            if ($accessTokenInfo) {
				$db->query("INSERT INTO evernote_sessions SET user_id='".$_SESSION['user_id']."', oauth_token='".$accessTokenInfo['oauth_token']."', edam_shard='".$accessTokenInfo['edam_shard']."', edam_userId='".$accessTokenInfo['edam_userId']."', edam_expires='".$accessTokenInfo['edam_expires']."', edam_noteStoreUrl='".$accessTokenInfo['edam_noteStoreUrl']."', edam_webApiUrlPrefix='".$accessTokenInfo['edam_webApiUrlPrefix']."';");
				getToken();
				header("Location: ./qNote.htm");
            } else {
                echo 'Failed to obtain token credentials.';
            }
        } catch (OAuthException $e) {
            echo 'Error obtaining token credentials: ' . $e->getMessage();
        }
	} else {
		// If the User clicks "decline" instead of "authorize", no verification code is sent
		//TODO info o bledach
		echo 'Content owner did not authorize the temporary credentials';
	}
}
else if(!isset($_SESSION['evernote'])) {
	//Is logged in but no token.
    if (!class_exists('OAuth')) {
        die("<span style=\"color:red\">The PHP OAuth Extension is not installed</span>");
    }
	
	try {
		$client = new Client(array(
			'consumerKey' => OAUTH_CONSUMER_KEY,
			'consumerSecret' => OAUTH_CONSUMER_SECRET,
			'sandbox' => SANDBOX
		));
		$requestTokenInfo = $client->getRequestToken('http://qualify.artpi.net?e=oauth_callback');
		if ($requestTokenInfo) {
			$_SESSION['requestToken'] = $requestTokenInfo['oauth_token'];
			$_SESSION['requestTokenSecret'] = $requestTokenInfo['oauth_token_secret'];
			$currentStatus = 'Obtained temporary credentials';

			header('Location: ' . $client->getAuthorizeUrl($_SESSION['requestToken']));
		} else {
			echo 'Failed to obtain temporary credentials.';
		}
	} catch (OAuthException $e) {
		echo 'Error obtaining temporary credentials: ' . $e->getMessage();
	}
	
}


?>
