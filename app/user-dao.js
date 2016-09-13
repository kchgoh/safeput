'use strict';

var async = require('async');
var db = require('./db');
var log = require('./logger');

db.appDbSchemaStatements.push("CREATE TABLE user ( username VARCHAR(255) PRIMARY KEY, password VARCHAR(255), refresh_token TEXT NULL )");

// db key constraint will error if dup
var create = function(username, password, cb) {
	db.run("INSERT INTO user (username, password) VALUES (?, ?)", username, password, cb);
};

// create a callback for sqlite when expecting to change (update/delete) one row only
var singleChangeHandler = function(cb) {
	return function(err) {
		if(err) {
			cb(err);
			return;
		}
		if(!this.changes || this.changes != 1) {	// NB "changes" is only for update/delete, not for insert
			cb(new Error("No record found to apply change"));
			return;
		}
		cb();
	};
};

var getUser = function(username, cb) {
	db.all("SELECT username, password, refresh_token FROM user WHERE username = ?", username, function(err, rows) {
		if(err) {
			cb(err);
			return;
		}
		if(!rows || rows.length === 0) {
			cb();
			return;
		}
		cb(null, rows[0]);
	});
};

// it's assumed caller has verified the permission. this module doesn't do password check.
var del = function(username, cb) {
	db.run("DELETE FROM user WHERE username = ?", username, singleChangeHandler(cb));
};

// it's assumed caller has verified the permission. this module doesn't do password check.
var changePassword = function(username, password, cb) {
	db.run("UPDATE user SET password = ? WHERE username = ?", password, username, singleChangeHandler(cb));
};

// callback 2nd arg is field value, or null if user not found (not an error)
var getUserField = function(username, dbField, cb) {
	getUser(username, function(err, user) {
		if(user) {
			cb(null, user[dbField]);
			return;
		}
		cb(err, null);
	});
};

// callback 2nd arg is encrypted password in db, or null if user not found (not an error)
var getEncPassword = function(username, cb) {
	getUserField(username, 'password', cb);
};

// callback 2nd arg is the token, null if not found
var getRefreshToken = function(username, cb) {
	getUserField(username, 'refresh_token', cb);
};

var setRefreshToken = function(username, token, cb) {
	db.run("UPDATE user SET refresh_token = ? WHERE username = ?", token, username, singleChangeHandler(cb));
};

module.exports.create = create;
module.exports.del = del;
module.exports.getUser = getUser;
module.exports.getEncPassword = getEncPassword;
module.exports.changePassword = changePassword;
module.exports.getRefreshToken = getRefreshToken;
module.exports.setRefreshToken = setRefreshToken;

