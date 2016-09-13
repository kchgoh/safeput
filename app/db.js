'use strict';

var sqlite3 = require('sqlite3').verbose();
var fs = require('fs');
var path = require('path');
var async = require('async');
var config = require('./config');
var log = require('./logger');

var needInitDb = !fs.existsSync(config.dbFilePath);
var db = new sqlite3.Database(config.dbFilePath);

// DAO classes to add DDL statements to this before main class call initSchema
db.appDbSchemaStatements = [];

db.initSchema = function(cb) {

	if(!needInitDb) {
		log.info("initialised db");
		cb();
		return;
	}

	var dbRun = function(sql, dbCb) {
		log.info(sql);
		db.run(sql, dbCb);
	}
	var onComplete = function(err, results) {
		if(!err)
			log.info("initialised db");
		cb(err);
	};

	// db.serialize is not much use as it only guarantee the SQLs are run in sequence. so
	// if we want to know when the FINAL SQL is done, we still have to attach a callback to
	// it. that's too unwieldy. ideally the db.serialize block itself should take an oncomplete
	// callback. but it doesn't. so instead, we just manage the whole thing with async.js
	async.eachSeries(db.appDbSchemaStatements,
		dbRun,
		onComplete
	);
}

// generic helper for update 1 field for a given list of table keys.
var updateInternal = function(table, keyField, keys, dataField, valueFunc, cb) {
	var stmt = db.prepare("UPDATE " + table + " SET " + dataField + " = ? WHERE " + keyField + " = ?");
	var doUpdate = function(key, itemCompleteCb) {
		var dataValue = valueFunc(key);
		if(!dataValue) {
			itemCompleteCb(new Error("No value for key " + key));
			return;
		}
		stmt.run(dataValue, key, function(err) {
			if(err) {
				log.error("Failed to update " + key);
			}
			itemCompleteCb(err);
		});
	};
	var onCompleteItems = function(err) {
		cb(err);
	};

	async.eachSeries(keys, doUpdate, onCompleteItems);
}

db.update = function(table, keyField, keys, dataField, dataValue, cb) {
	updateInternal(table, keyField, keys, dataField, function(key) { return dataValue; }, cb);
}

db.updateMultiValues = function(table, keyField, keys, dataField, dataValueMap, cb) {
	updateInternal(table, keyField, keys, dataField, function(key) { return dataValueMap[key]; }, cb);
}

// db is used as a singleton, so return the instance itself
module.exports = db;
