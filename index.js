var gcm = require('node-gcm');
var apn = require('apn');
var mpns = require('mpns');
var adm = require('node-adm');
var Parallel = require('node-parallel');
var _ = require('lodash');

var NotificationPusher = function NotificationPusher(options) {
    this.settings = {
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

    _.extend(this.settings, options);
    return this;
};

NotificationPusher.prototype.send = function(pushId, data, callback) {   
    var GCMSender = new gcm.Sender(this.settings.GCM_ID);
    var APNOptions = {gateway: this.settings.APN_GATEWAY};
    var APNConnection = new apn.Connection(APNOptions);
    var admoptions = {client_id: this.settings.ADM_CLIEND_ID, client_secret: this.settings.ADM_CLIEND_SECRET};
    var ADMSender = new adm.Sender(admoptions);
    
    var regIdsGCM = [];
    var regIdsAPN = [];
    var regIdsMPNS = [];
    var regIdsADM = [];

    var messageGCM = '';
    var messageAPN = '';

    var parallel = new Parallel();  
    parallel.timeout(3000);

    if(!pushId.length) {
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
            delayWhileIdle: this.settings.GCM_DELAYWHILEIDLE,
            timeToLive: this.settings.GCM_TIMETOLIVE,
            data: data
        });
        messageGCM.addData('msgcnt', this.settings.GCM_MSGCNT);

        parallel.add(function(done){
            GCMSender.send(messageGCM, regIdsGCM, this.settings.GCM_RETRIES, function (err, result) { 
            if (result.success === 1)
                done(0,1);
            else
                done(0, ' ANDROID: ' + (result.results)[0].error);
            });         
        })
    }
    
    if (regIdsAPN[0] != undefined){
        messageAPN = new apn.Notification();
        messageAPN.expiry = Math.floor(Date.now() / 1000) +  this.settings.APN_EXPIRY;    // 1 hour
        messageAPN.badge = this.settings.GCM_MSGCNT;
        messageAPN.sound = this.settings.APN_SOUND;
        messageAPN.alert = data.title;
        messageAPN.payload = data;
        
        APNConnection.pushNotification(messageAPN, regIdsAPN);  

        parallel.add(function(done){
            apnConnection.on('error', function(){
                done(0,' IOS: error');
            });
            apnConnection.on('socketError', function(){
                done(0,' IOS: socketError');
            });
            apnConnection.on('transmissionError', function(){
                done(0,' IOS: transmissionError' );
            });
            apnConnection.on('cacheTooSmall', function(){
                done(0,' IOS: cacheTooSmall');
            });
        })
    }
    
    for (i = 0; i<regIdsMPNS.length; i++){
        var tempMPNS = regIdsMPNS[i];
        parallel.add(function(done){
            mpns.sendToast(tempMPNS, data.title, data.message, data, function (result){
                if (result === undefined)
                    done(0,1);
                else
                    done(0, ' Windows Phone: ' + result);               
            });
        })
    }

    //amazon
    for (i = 0; i<regIdsADM.length; i++){
        var tempADM = regIdsADM[i];
        parallel.add(function(done){
            ADMSender.send(data, tempADM, function (result){
                if (result === undefined)
                    done(0,1);
                else
                    done(0, ' Amazon Phone: ' + result);
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
            callback(pushResult);
        else
            callback(true);
    })
};

module.exports = NotificationPusher;