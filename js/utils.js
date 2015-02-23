Router = function() {
	var params = {};
	var parsers = {};
	var router = {
		parse: function (route) {
			if(route.length > 3) {
				var p = route.split("&");
				for(var i=0;i<p.length;i++) {
					var v = p[i].split("=");
					if(params[v[0]] !== v[1]) {
						if(parsers[v[0]]) {
							parsers[v[0]](v[1]);
						}
						params[v[0]] = v[1];
					}
				}
			}
		},
		bind: function (param, val) {
			parsers[param] = val;
		},
		go: function (par) {
			var h = [];
			var newPar = $.extend({},params,par);
			for(p in newPar) {
				h.push(p + "=" + newPar[p]);
			}
			window.location.hash = "#" + h.join("&");
		}
	}
	
	window.onhashchange = function () {
        router.parse(window.location.hash.split('#')[1]);
    }
	
	return router;
}