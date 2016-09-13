'use strict';

var async = require('async');
var db = require('./db');
var log = require('./logger');

function ImageDAO() {
	db.appDbSchemaStatements.push(
		"CREATE TABLE image_info ( file_name VARCHAR(255) PRIMARY KEY, upload_time DATETIME, tag_name VARCHAR(255) NULL, seq_num INT NULL )"
	);
}

ImageDAO.prototype.insert = function(name, cb) {
	var stmt = db.prepare("INSERT INTO image_info (file_name, upload_time) VALUES (?, DATETIME('now'))");
	stmt.run(name, function(err) {
		cb(err);
	});
	stmt.finalize();
};

ImageDAO.prototype.getList = function(rowCb, completeCb) {
	var displayDataByName = {};
	db.each("SELECT file_name, upload_time, tag_name, seq_num FROM image_info ORDER BY seq_num",
		rowCb,
		function(err, rowCount) {
			log.info(rowCount + " image db row(s) retrieved");
			completeCb(err);
		}
	);
};

ImageDAO.prototype.del = function(file, cb) {
	var stmt = db.prepare("DELETE FROM image_info WHERE file_name = ?");
	stmt.run(file, function(err) {
		if(!err) {
			log.info(this.changes + " image row(s) deleted");
		}
		cb(err);
	});
	stmt.finalize();
};

ImageDAO.prototype.tag = function(files, tagName, cb) {
	db.update("image_info", "file_name", files, "tag_name", tagName, cb);
};

ImageDAO.prototype.seq = function(fileSeqMap, cb) {
	db.updateMultiValues("image_info", "file_name", Object.keys(fileSeqMap), "seq_num", fileSeqMap, cb);
};

module.exports = ImageDAO;
