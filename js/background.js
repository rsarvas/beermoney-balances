var toClose = {};

var GA_TRACKING_ID = 'UA-23447195-4';
var GA_CLIENT_ID = undefined;

var autoUpdateTabId = undefined;
var autoUpdateSites = [];

function getClientId(completion) {
	if (GA_CLIENT_ID != undefined) {
		completion(GA_CLIENT_ID);
	} else {
		chrome.storage.local.get("GA_CLIENT_ID",function(data) {
			if (Object.keys(data).length == 0) {
				GA_CLIENT_ID = "" + Math.round(2147483647 * Math.random());
				chrome.storage.local.set({GA_CLIENT_ID:GA_CLIENT_ID})
			} else {
				GA_CLIENT_ID = data["GA_CLIENT_ID"];
			}
			completion(GA_CLIENT_ID);
		});
	}
	
}

function logEvent(eventCategory,eventAction) {
	var message = "&t=event&ec=" + eventCategory + "&ea=" + eventAction;
	sendGARequest(message);
}

function logPage(pageName) {
	var message = "&t=pageview&dh=extension&dp=" + pageName;
	sendGARequest(message);
}

function sendGARequest(message) {
	getClientId(function (cliendId) {
		var baseMessage = "v=1&tid=" + GA_TRACKING_ID + "&cid=" + GA_CLIENT_ID + "&aip=1&ds=add-on";
		var fullMessage = baseMessage + message;
		var request = new XMLHttpRequest();
		request.open("POST", "https://www.google-analytics.com/collect", true);
		request.send(fullMessage);
	});
}

function checkAutoUpdates() {
	readDataAndMeta(function(sites,metaData,other) {
		if(!other.options.autoEnabled) {
			return;
		}
		var timestamp = Math.floor(Date.now() / 1000);
		var toUpdate = [];
		sites.forEach(function(site) {
			var meta = metaData[site.name];
			if(site.options && site.options.autoRefresh > 0) {
				var diff = timestamp - site.last
				if (diff > site.options.autoRefresh * 60) {
					toUpdate.push(meta.url);
				}
			}
		});
		autoUpdateSites = toUpdate;
		if(toUpdate.length > 0) {
			performAutoUpdates();
		}
	});

	setTimeout(checkAutoUpdates,30000);
}

function performAutoUpdates(site) {
	getAutoUpdateTab(function(tab) {
		if (autoUpdateSites.length > 0) {
			var site = autoUpdateSites[0];
			chrome.tabs.update(tab.id,{url:site});	
		} else {
			chrome.tabs.update(tab.id,{url:"/auto.html"});
		}
		
	});
}

function sendNoPointsMessage(site) {
	console.log("No points");
	var url = "https://maker.ifttt.com/trigger/beermoney-no-points/with/key/c-sPwPCCOmjBfgJ5VyjsH-";
	var message = {site:site};
	var request = new XMLHttpRequest();
	request.open("POST", url, true);
	request.send(message);
}

sendNoPointsMessage();

function getAutoUpdateTab(callback) {
	if(autoUpdateTabId != undefined) {
		chrome.tabs.get(autoUpdateTabId,function(tab) {
			if (chrome.runtime.lastError) {
				autoUpdateTabId = undefined;
				getAutoUpdateTab(callback);
			} else {
				callback(tab);	
			}
			
		});
	} else {
		chrome.tabs.create({'url': "/auto.html",active:false},function(tab) {
			autoUpdateTabId = tab.id;
			callback(tab);
		});
	}
}

checkAutoUpdates();

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message == "save-options") {
		logEvent("save-options","save-options-" + request.site);
	} else if(request.message == "log-page") {
		logPage(request.pageName);
	} else if(request.message == "log-event") {
		logEvent(request.eventCategory,request.eventAction);
	} else if(request.message == "start-update") {
		toClose[request.site] = request.tab;
	} else if(request.message == "save") {
		if (request.change != 0) {
			logEvent("change-balance","change-" + request.site);
		}
		if(toClose[request.site] == sender.tab.id) {
			toClose[request.site] = null;
			chrome.tabs.remove(sender.tab.id);	
		}
		if(sender.tab.id == autoUpdateTabId) {
			autoUpdateSites.shift();
			performAutoUpdates();
		}
		
	}
});