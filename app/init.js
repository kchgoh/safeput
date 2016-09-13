'use strict';

var async = require('async');
var fs = require('fs');
var https = require('https');
var http = require('http');		// for debug/test only
var config = require('./config');
var db = require('./db');
var log = require('./logger');

var run = function(app) {
	async.series([
		db.initSchema,
		initHttp(app),
	], throwOrComplete);
};

var initHttp = function(app) {
	return function(cb) {
		if(process.argv.length > 2
				&& process.argv[2] === "--no-ssl") {
			http.createServer(app).listen(config.port);
			log.info("HTTP server started");
		} else {
			const options = {
				key: fs.readFileSync(config.sslKeyPath),
				cert: fs.readFileSync(config.sslCertPath)
			};
			https.createServer(options, app).listen(config.port);
			log.info("HTTPS server started");
		}
		cb();
	}
};

var throwOrComplete = function(err, results) {
	if(err)
		throw err;
	log.info("init completed");
};

module.exports.run = run;
