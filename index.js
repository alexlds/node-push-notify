var gcm = require('node-gcm');
var apn = require('apn');
var mpns = require('mpns');
var adm = require('node-adm');
var Parallel = require('node-parallel');
var _ = require('lodash');

var settings = {
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

var NotificationPusher = function NotificationPusher(options) {
    _.extend(settings, options);
    return this;
};

NotificationPusher.prototype.send = function(pushId, data, callback) { 
    var GCMSender = new gcm.Sender(settings.GCM_ID);
    var APNOptions = {gateway: settings.APN_GATEWAY};
    var APNConnection = new apn.Connection(APNOptions);
    var admoptions = {client_id: settings.ADM_CLIEND_ID, client_secret: settings.ADM_CLIEND_SECRET};
    var ADMSender = new adm.Sender(admoptions);
    
    var regIdsGCM = [];
    var regIdsAPN = [];
    var regIdsMPNS = [];
    var regIdsADM = [];

    var messageGCM = '';
    var messageAPN = '';

    var parallel = new Parallel();  
    parallel.timeout(10000);

    if(pushId instanceof Array) {
        
    } else if(pushId.length) {
        pushId = [pushId];
    }

    for (i = 0; i<pushId.length; i++){
        if (pushId[i].substring(0,4) === 'http')
            regIdsMPNS.push(pushId);
        else if (pushId[i].length>64)
            regIdsGCM.push(pushId[i]);
        else if (pushId[i].length === 64)
            regIdsAPN.push(pushId[i]);
        else if (true) // need to find condition for amazon token
            regIdsADM.push(pushId[i]);
    }

    if (regIdsGCM[0] != undefined){ 
        messageGCM = new gcm.Message({
            collapseKey: 'demo',
            delayWhileIdle: settings.GCM_DELAYWHILEIDLE,
            timeToLive: settings.GCM_TIMETOLIVE,
            data: data
        });
        messageGCM.addData('msgcnt', settings.GCM_MSGCNT);

        parallel.add(function(done){
            GCMSender.send(messageGCM, regIdsGCM, settings.GCM_RETRIES, function (err, result) { 
                if(err) {
                    done({device: 'android', message: err});
                } else {
                    if (result && result.success === 1)
                        done(0,1);
                    else
                        done({device: 'android', message: (result.results)[0].error});
                }
            });         
        })
    }
    
    if (regIdsAPN[0] != undefined){
        messageAPN = new apn.Notification();
        messageAPN.expiry = Math.floor(Date.now() / 1000) +  settings.APN_EXPIRY;    // 1 hour
        messageAPN.badge = settings.GCM_MSGCNT;
        messageAPN.sound = settings.APN_SOUND;
        messageAPN.alert = data.title;
        messageAPN.payload = data;
        
        APNConnection.pushNotification(messageAPN, regIdsAPN);  

        parallel.add(function(done){
            apnConnection.on('error', function(){
                done({device: 'ios', message: 'error'});
            });
            apnConnection.on('socketError', function(){
                done({device: 'ios', message: 'socketError'});
            });
            apnConnection.on('transmissionError', function(){
                done({device: 'ios', message: 'transmissionError'});
            });
            apnConnection.on('cacheTooSmall', function(){
                done({device: 'ios', message: 'cacheTooSmall'});
            });
        })
    }
    
    for (i = 0; i<regIdsMPNS.length; i++){
        var tempMPNS = regIdsMPNS[i];
        parallel.add(function(done){
            mpns.sendToast(tempMPNS, data.title, data.message, data, function (err){
                if (err === undefined)
                    done(0,1);
                else
                    done({device: 'windows phone', message: err});
            });
        })
    }

    //amazon
    for (i = 0; i<regIdsADM.length; i++){
        var tempADM = regIdsADM[i];
        parallel.add(function(done){
            ADMSender.send(data, tempADM, function (err){
                if (err === undefined)
                    done(0,1);
                else
                    done({device: 'amazon phone', message: err});
            });
        })
    }

    parallel.done(function(err, results){
        var pushResult ='';
        for (i=0; i<results.length; i++){
            if (results[i] != 1)
                pushResult = pushResult + results[i];
        }
        if (pushResult.length > 1)
            callback(null, pushResult);
        else 
            callback(err);
    })
};

module.exports = NotificationPusher;