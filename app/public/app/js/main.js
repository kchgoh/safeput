function Main(resources) {
	var appRoute = resources.appRoute;
	var authBaseRoute = resources.authBaseRoute;
	var tokenStore = resources.tokenStore;
	var util = new Util(tokenStore, authBaseRoute);

	var self = this;

	$(document).ready(function() {
		self.uploader = new Uploader(tokenStore, function() {
			refreshImagesTable();
		});

		new TableInputComponent({
			inputDisplayName: "Tag",
			inputName: "tagName",
			itemsName: "files",
			buttonPanel: $("#imagesTableButtons"),
			tableID: "#imagesTable",
			url: appRoute + "/api/images/tag",
			onComplete: refreshImagesTable,
		}, util);

		refreshImagesTable();

		// as mentioned in the api doc, for table rows it needs to act on tbody, not the table.
		$("#imagesTable tbody").sortable();
		$("#imagesTable tbody").disableSelection();
	});

	function refreshImagesTable() {
		$("#imagesTable tr").remove();
		util.sajax({
			url: appRoute + "/api/images",
			type: "GET",
			success: function(data) {
				var table = $("#imagesTable tbody");
				data.forEach(function(item) {
					table.append(createImageRowDom(item));
				});
			},
		});
	}
	this.refreshImagesTable = refreshImagesTable;


	function createImageRowDom(item) {
		var rowDom = $('<tr/>');
		rowDom.append(util.createCellDom(util.createCheckboxDom(item.fileName)));
		rowDom.append(util.createCellDom('<a href="javascript:void(0)" onclick="main.downloadImage(this);">' + item.fileName + '</a>'));
		rowDom.append(util.createCellDom(item.thumbnailData ? '<img src="data:image/png;base64,' + item.thumbnailData + '"/>' : ''));
		rowDom.append(util.createCellDom(item.contentTypes));
		rowDom.append(util.createCellDom(item.uploadTime));
		rowDom.append(util.createCellDom(item.tagName));
		rowDom.append(util.createCellDom(item.seqNum));
		return rowDom;
	}

	this.downloadImage = function(link) {
		util.download(link, appRoute + "/api/images/image/");
	}

	this.submitDeleteSelectedImages = function() {
		var submitData = {files: util.getSelectedKeys("#imagesTable")};
		if(!submitData.files || submitData.files.length == 0) {
			alert("No row selected");
			return;
		}
		util.sajax({
			url: appRoute + "/api/images",
			type: "DELETE",
			contentType: "application/json",
			data: JSON.stringify(submitData),
			success: function(data) {
				refreshImagesTable();
			},
		});
	}

	this.setSeqAndSubmit = function() {
		var rows = $("#imagesTable tr");
		var i = 1;
		var submitData = { fileSeqMap: {} };
		rows.each(function(index) {
			$(this).find("td").last().text(i);
			var file = $(this).find("td input").val();
			submitData.fileSeqMap[file] = i;
			++i;
		});

		util.sajax({
			url: appRoute + "/api/images/seq",
			type: "POST",
			contentType: "application/json",
			data: JSON.stringify(submitData),
			success: function(data) {
				refreshImagesTable();
			},
		});
	}


	this.logout = function() {
		util.sajax({
			url: authBaseRoute + "/logout",
			type: "POST",
			contentType: "application/json",
			success: function(data) {
				tokenStore.dispose();
				location.href = authBaseRoute + "/login?message=Logged Out";
			},
			error: function() {
				tokenStore.dispose();
				location.href = authBaseRoute + "/login";
			}
		});
	}
}

/**
 * Encapsulate logic for upload using Dropzone
 **/
function Uploader(tokenStore, onCompleteCb) {
	var dz = new Dropzone("#uploadDropzone", {
		paramName: "item",
		maxFilesize: 2,
		autoProcessQueue: false,
		parallelUploads: 1,
	});
	dz.on("queuecomplete", onCompleteCb);
	Dropzone.autoDiscover = false;

	var scheduleId;

	function stopScheduleUpload() {
		clearInterval(scheduleId);
	}

	function scheduleUploadTick() {
		var files = dz.getQueuedFiles();
		if(files && files.length > 0) {
			tokenStore.getAccessToken(function(err, token) {
				if(err) {
					alert("Failed to get credential for upload");
					console.error(err);
					// have to stop completely, otherwise it will keep on retrying on tick
					stopScheduleUpload();
					return;
				}
				dz.options.headers = {"x-access-token": token};
				dz.processQueue();
			});
		} else {
			stopScheduleUpload();
		}
	}

	this.startScheduleUpload = function() {
		scheduleId = setInterval(scheduleUploadTick, 3000);
	};

	this.resetDropzone = function() {
		dz.removeAllFiles(true);
	};

	/**
	 * Called by integration test to programmatically trigger file upload
	 **/
	this.testAddFile = function testAddFile(fileName, filePath) {
		// integration test runner would have set this already
		var file = $('.dz-hidden-input')[0].files[0];
		dz.addFile(file);
		console.log("test added file " + filePath);
	};
}

/**
 * Component for adding a button that will prompt for a single input and submit
 * it for the selected table rows.
 **/
function TableInputComponent(params, util) {
	var inputDisplayName = params.inputDisplayName;
	var inputName = params.inputName;
	var itemsName = params.itemsName;
	var buttonPanel = params.buttonPanel;
	var url = params.url;
	var tableID = params.tableID;
	var onComplete = params.onComplete;

	var modalPrompt = $("#modalPrompt");

	function submitInput() {
		var submitData = {};
		submitData[itemsName] = util.getSelectedKeys(tableID);
		submitData[inputName] = modalPrompt.find("input").val();

		util.sajax({
			url: url,
			type: "POST",
			contentType: "application/json",
			data: JSON.stringify(submitData),
			success: function(data) {
				modalPrompt.modal('hide');
				onComplete();
			},
		});
	}

	// this is only 1 modal form. but we change the display label depending on
	// the component it is called from.
	function showPrompt() {
		modalPrompt.find("label").text(inputDisplayName);
		var submitButton = modalPrompt.find("#modalSubmit");
		submitButton.off();
		submitButton.on("click", submitInput);
		modalPrompt.modal();
	}



	var showPromptButton = $('<button type="submit" class="btn btn-default">' + inputDisplayName + '</button>');
	showPromptButton.on("click", showPrompt);
	buttonPanel.append(showPromptButton);
	buttonPanel.append(' ');
}

/**
 * Retrieving token should go via this, which handles the refresh token flow.
 **/
function TokenStore(accessToken, refreshToken, authBaseRoute) {
	// keep these private so getting token must be via method
	var atk = accessToken;
	var rtk = refreshToken;
	var refreshTime = new Date();

	if(!refreshToken) {
		throw new Error("Missing refresh token");
	}
	if(!accessToken) {
		refreshTime = 0;
	}

	var isAccessTokenExpired = function() {
		var elapsed = (new Date()).getTime() - refreshTime;
		return elapsed > (10 * 1000);	// this should be more conservative (shorter time) than the actual token expire time
	};

	// callback args: err, access token
	this.getAccessToken = function(cb) {
		if(isAccessTokenExpired()) {
			console.log("access token expired. refreshing...");
			$.ajax({
				url: authBaseRoute + "/refresh-token",
				type: "POST",
				headers: {"x-refresh-token": rtk},
				success: function(data) {
					console.log("retrieved new token");
					rtk = data.refreshToken;
					atk = data.accessToken;
					refreshTime = new Date();
					cb(null, atk);
				},
				error: function(xhr, status, err) {
					console.error(xhr);
					cb(new Error());
				}
			});
		} else {
			cb(null, atk);
		}
	};
	this.dispose = function() {
		atk = null;
		rtk = null;
	};
}

function Util(tokenStore, authBaseRoute) {
	this.createCellDom = function(value) {
		var cellDom = $('<td/>');
		cellDom.append(value);
		return cellDom;
	};
	this.createCheckboxDom = function(key) {
		return '<input type="checkbox" value="' + key + '">';
	};
	this.getSelectedKeys = function(tableID) {
		var selectedKeys = [];
		$(tableID + " input:checked").each(function(index) {
			selectedKeys.push($(this).val());
		});
		return selectedKeys;
	};
	this.download = function(jqLink, downloadBaseUrl) {
		var filename = $(jqLink).text();
		this.sajax({
			url: downloadBaseUrl + filename,
			type: "GET",
			success: function(data) {
				$("#downloadFrame").attr("src", data.url);
			},
		});
	};
	/**
	 * Wrapper on jquery $.ajax to handle refresh token when needed.
	 * Argument options is same.
	 */
	this.sajax = function(options) {
		tokenStore.getAccessToken(function(err, token) {
			if(err) {
				if(options.error) {
					options.error(null, "error", "Failed to get token");
					return;
				}
				// if no specific error handler, then any token failure redirect to login, as we can't do anything anyway.
				// alternatively, show an alert requesting user to re-login.
				location.href = authBaseRoute + "/login";
				return;
			}
			if(!options.headers)
				options.headers = {};
			options.headers["x-access-token"] = token;
			$.ajax(options);
		});
	};
}


