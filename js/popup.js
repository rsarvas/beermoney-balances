function createEntries(sites,metaData,other) {
	var sitesHtml = "";
	if(sites.length == 0) {
		$("#no-balances").show();
		$("#balances").hide();
	} else {
		$("#no-balances").hide();
		$("#balances").show();
	}

	sites = sites.filter(function(s) {
		return s.entries != undefined && s.entries.length > 0 && metaData[s.name] != undefined;
	});

	sites = sites.sort(function(a,b) {
		return b.last - a.last;
	});

	$("#balances").text("");

	var alt = false;

	sites.forEach(function (site) {
		var meta = metaData[site.name];
		var entries = site.entries;
		var balance = entries[entries.length - 1].b;
		var usdText = "";
		if (meta != undefined && meta.conversion != undefined) {
			usdText = "$" + (balance / meta.conversion).toFixed(2);
		}
		var cls = alt ? "site-balance-alt" : "site-balance";
		alt = !alt;
		sitesHtml += '<div class="site-balance-common ' + cls + '">';
		sitesHtml += '<h1 style="text-align:center"><a class="site-link" href="' + meta["url"] + '">'  + meta["name"] + "</a></h1>"; 
		sitesHtml += '<div class="site-balance-inner">';
		sitesHtml += '<div class="site-balance-left">';
		sitesHtml += '<h2>Balance: ';
		if (meta.conversion == 1) {
			sitesHtml += usdText;
		} else if(usdText.length > 0) {
			sitesHtml += balance + " (" + usdText + ")";
		} else {
			sitesHtml += balance;
		}

		sitesHtml += "</h2>";

		sitesHtml += "<p>Last checked: " + jQuery.timeago(new Date(site.last * 1000)) + "</p>";
		if(site.entries.length > 0) {
			var lastEntry = site.entries[site.entries.length - 1]
			sitesHtml += "<p>Last balance change: " + jQuery.timeago(new Date(lastEntry.t * 1000)) + "</p>"
		}
		if(site.secondaryBalances != undefined) {
			sitesHtml += "<br/>"
			for(var key in site.secondaryBalances) {
				var item = site.secondaryBalances[key];
				var date = new Date(item.t * 1000);
				sitesHtml += '<p>' + key + ": <b>" + item.v + "</b> " + jQuery.timeago(date) + '</p>';
			}
		}
		
		sitesHtml += '</div>';
		if (meta != undefined && meta.url != undefined) {
			sitesHtml += '<a class="update-link plain" href="' + meta.url + '" data-site="'+ site.name +'"><i class="plain icon-arrows-cw" ></i></a>'
		}
		sitesHtml += '</div>';
		sitesHtml += '</div>';
	});

	$("#balances").append($(sitesHtml));
	setupLinks();
}

function setupLinks() {	
	$(".update-link").click(updateBalance);
	$("#twitter-link").click(showLink);
	$("#home-link").click(showLink);
	$("#sup-link").click(showLink);
	$(".site-link").click(showLink);
}


$("#full-link").click(showFullPage);

function updateBalance(event) {
	var url = getEventHref(event);
	var site = $(event.target).parent()[0].dataset.site;
	var action = "update-" + site;
	chrome.runtime.sendMessage({message:"log-event",eventCategory:"update-balance",eventAction:action});
	chrome.tabs.create({'url': url,active:false}, function(tab) {
		chrome.runtime.sendMessage({message: "start-update",tab:tab.id,site:site});
    });
	return false;
}

function showFullPage() {
	chrome.tabs.create({'url': chrome.extension.getURL('full.html')});
	return false;
}

function showLink(event) {
	var url = getEventHref(event);
	chrome.tabs.create({'url': url});
	return false;
}

function getEventHref(event) {
	var url = event.target.href;
	if (url == undefined) {
		url = $(event.target).parent()[0].href;
	}
	return url;
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if(request.message == "save") {
		reloadAll();
	}
});

function trackView() {
	chrome.runtime.sendMessage({message:"log-page",pageName:"/popup.html"});
}

setTimeout(function() { trackView(); }, 300);
readDataAndMeta(createEntries);
replaceVersionNumber();
