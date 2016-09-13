'use strict';

var express = require('express');
var fs = require('fs');
var path = require('path');
var async = require('async');
var imageMgk = require('imagemagick');
var multer = require('multer');

var log = require('./logger');
var util = require('./util');
var ImageDAO = require('./image-dao');
var dao = new ImageDAO();
var config = require('./config');
var upload = multer({ dest: config.tmpDir + '/' });
var download = require('./download');

var handlePost = function(req, res, next) {
	log.info('received file ' + req.file);

	const tempFilePath = req.file.path;
	const targetFileName = req.file.originalname;
	const targetFilePath = path.join(config.filesDir, targetFileName);
	const thumbnailFilePath = path.join(config.thumbnailsDir, targetFileName);

	var moveFileFromUploadTemp = function(cb) {
		fs.rename(tempFilePath, targetFilePath, function(err) {
			cb(err);
		});
	};
	var insertToDb = function(cb) {
		dao.insert(targetFileName, cb);
	};
	var createThumbnail = function(cb) {
		imageMgk.resize({
			srcPath: targetFilePath,
			dstPath: thumbnailFilePath,
			width: 200,
		}, function(err, stdout, stderr) {
			cb(err);
		});
	};
	var onComplete = function(err, results) {
		if(err) {
			next(err);
			return;
		}
		res.json({success: true});
	};

	async.series([
		moveFileFromUploadTemp,
		insertToDb,
		createThumbnail,
	], onComplete);
};

var ImageDisplayRow = function() {
	this.contentTypes = "";
}
ImageDisplayRow.prototype.fromDb = function(row) {
	this.fileName = row.file_name;
	this.contentTypes += "D";
	this.uploadTime = row.upload_time;
	this.tagName = row.tag_name;
	this.seqNum = row.seq_num;
}
ImageDisplayRow.prototype.fromFile = function(file) {
	this.fileName = file;
	this.contentTypes += "F";
}
ImageDisplayRow.prototype.fromThumbnail = function(file, data) {
	this.filename = file;
	this.contentTypes += "T";
	this.thumbnailData = data;
}

var handleGetList = function(req, res, next) {
	function newOrGet(map, key) {
		if(map[key])
			return map[key];
		map[key] = new ImageDisplayRow();
		return map[key];
	}

	var addRowsFromDb = function(cb) {
		var displayDataByName = {};
		dao.getList(
			function(err, row) {
				newOrGet(displayDataByName, row.file_name).fromDb(row);
			},
			function(err) {
				cb(err, displayDataByName);
			}
		);
	};
	var isVisibleFile = function(fileName) {
		return !fileName.startsWith(".");
	};
	var addUpdateRowsFromFiles = function(displayDataByName, cb) {
		fs.readdir(config.filesDir, function(err, files) {
			if(err) {
				cb(err);
				return;
			}
			if(files) {
				files.filter(isVisibleFile).forEach(function(file) {
					newOrGet(displayDataByName, file).fromFile(file);
				});
			}
			cb(null, displayDataByName);
		});
	};
	var addUpdateRowsFromThumbnails = function(displayDataByName, cb) {
		var handleFiles = function(err, files){
			if(err || !files) {
				cb(err, displayDataByName);
				return;
			}
			async.eachSeries(files.filter(isVisibleFile),
				addUpdateSingleRowFromThumbnail,
				function(err, results) {
					cb(err, displayDataByName);
				}
			);
		};
		var addUpdateSingleRowFromThumbnail = function(file, singleCb) {
			fs.readFile(path.join(config.thumbnailsDir, file), function(err, data) {
				if(err) {
					singleCb(err);
					return;
				}
				var bdata = data.toString("base64");
				newOrGet(displayDataByName, file).fromThumbnail(file, bdata);
				singleCb();
			});
		};

		fs.readdir(config.thumbnailsDir, handleFiles);
	};
	var toDataArray = function(displayDataByName, cb) {
		var dataArray = Object.keys(displayDataByName).map(function(key) {
			return displayDataByName[key];
		});
		cb(null, dataArray);
	};
	var onComplete = function(err, dataArray) {
		if(err) {
			next(err);
			return;
		}
		res.json(dataArray);
	};

	async.waterfall([
		addRowsFromDb,
		addUpdateRowsFromFiles,
		addUpdateRowsFromThumbnails,
		toDataArray,
	], onComplete);

};

var handleDelete = function(req, res, next) {
	var tryDeleteFile = function(filePath, cb) {
		fs.access(filePath, fs.F_OK | fs.W_OK, function(err) {
			if(err){
				log.info(filePath + "not found in file system. ignored");
				cb();
			} else {
				fs.unlink(filePath, function(err) {
					if(!err){
						log.info("Deleted file " + filePath);
					}
					cb(err);
				});
			}
		});
	};
	var deleteFile = function(file, cb) {
		var filePath = path.join(config.filesDir, file);
		tryDeleteFile(filePath, cb);
	};
	var deleteThumbnail = function(file, cb) {
		var thumbnailFilePath = path.join(config.thumbnailsDir, file);
		tryDeleteFile(thumbnailFilePath, cb);
	};
	var deleteDbRow = function(file, cb) {
		dao.del(file, cb);
	};
	var onCompleteItem = function(err, itemCompleteCb) {
		itemCompleteCb(err);
	};
	var processItem = function(file, itemCompleteCb) {
		async.series([
			function(cb) { deleteFile(file, cb); },
			function(cb) { deleteThumbnail(file, cb); },
			function(cb) { deleteDbRow(file, cb); }
		], function(err, results) { onCompleteItem(err, itemCompleteCb); }
		);
	};

	async.eachSeries(req.body.files, processItem, util.funcRespondOKorPassErr(res, next));

};

var handleTag = function(req, res, next) {
	var checkArgs = function(cb) {
		if(!req.body.tagName || !req.body.files) {
			cb(new Error("Missing argument"));
			return;
		}
		cb();
	};
	var doTag = function(cb) {
		dao.tag(req.body.files, req.body.tagName, cb);
	};
	async.series([
		checkArgs,
		doTag,
	], util.funcRespondOKorPassErr(res, next));
};

var handleSeq = function(req, res, next) {
	dao.seq(
		req.body.fileSeqMap,
		util.funcRespondOKorPassErr(res, next)
	);
}

var handleGetDownloadUrl = function(req, res, next) {
	download.handleGetUrl(req.params.filename, path.join(config.filesDir, req.params.filename), res, next);
};

var router = express.Router();
router.post('/', upload.single('item'), handlePost);
router.get('/', handleGetList);
router.get('/image/:filename', handleGetDownloadUrl);	// part after : will be available as req.param.XX
router.delete('/', handleDelete);
router.post('/tag', handleTag);
router.post('/seq', handleSeq);

module.exports.router = router;
module.exports.ImageDisplayRow = ImageDisplayRow;
