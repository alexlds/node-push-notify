var SETTINGS = (function() {
	var private = {
		'GCM_ID': 'PUT-YOUR-GCM-SERVER-API-KEY',	
		'GCM_MSGCNT': '1',
		'GCM_RETRIES': 4,
		'GCM_TIMETOLIVE': 3000,	
		'GCM_DELAYWHILEIDLE' : false,
		'APN_GATEWAY': 'gateway.sandbox.push.apple.com',
		'APN_EXPIRY' : 3600, 
		'APN_SOUND': 'ping.aiff',
		"ADM_CLIEND_ID": 'PUT-YOUR-ADM-CLIENT-ID',
		"ADM_CLIEND_SECRET": 'PUT-YOUR-ADM-CLIENT-SECRET'
	};
	return {
		get: function(name) { return private[name]; }
    };
})();

module.exports.get = SETTINGS.get;
