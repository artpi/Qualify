var register=function() {
	$("#login").hide('slow');
	$("#register").show('slow');
}

$(document).ready(function() {
	$("#login form").on('submit', function(evt) {
		evt.preventDefault();
		var o = $(this);
		var login = o.find("input[type=email]").val();
		var pass = o.find("input[type=password]").val();
		o.find(".comm").html();
		o.find("button[type=submit]").attr( "disabled", "disabled");
		$.post('index.php', {e:'login', login: login, pass: pass}, function(data, status, x) {
			o.find("button[type=submit]").removeAttr( "disabled");
			if(x.status === 202) {
				o.find(".comm").html('<div class="alert alert-danger"><strong>Oh snap!</strong> Submitted login and password do not match. But as they say, <i>Errare humanum est.</i> Please, try again.</div>');
			} else if(x.status==201){
				document.location = './index.php';
			}
		});
	});

	$("#register form").on('submit', function(evt) {
		evt.preventDefault();
		var o = $(this);
		var login1 = o.find("input[name=email1]").val();
		var login2 = o.find("input[name=email2]").val();
		var pass1 = o.find("input[name=pass1]").val();
		var pass2 = o.find("input[name=pass2]").val();
		
		if(login1 !== login2) {
			o.find(".comm").html('<div class="alert alert-danger">Emails do not match! Please enter email address twice.</div>');
			o.find("input[name=email2]").val("");
		} else if(pass1 !== pass2) {
			o.find(".comm").html('<div class="alert alert-danger">Passwords do not match! Please input the same password twice.</div>');
			o.find("input[name=pass1]").val("");
			o.find("input[name=pass2]").val("");
		} else {
			o.find(".comm").html();
			o.find("button[type=submit]").attr( "disabled", "disabled");
			$.post('index.php', {e:'register', login: login1, pass: pass1}, function(data, status, x) {
				o.find("button[type=submit]").removeAttr( "disabled");
				if(x.status === 202) {
					o.find(".comm").html('<div class="alert alert-danger"><strong>Oh dear!</strong> Your email is already in use. Are you sure you dont have account yet?</div>');
				} else if(x.status==201){
					document.location = './index.php';
				}
			});
		}
	});
});