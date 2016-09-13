'use strict';

var log = require('./logger');

// most commonly the "oncomplete" function for api calls are respond ok, or pass error to later error handler
// so extract this logic here
module.exports.funcRespondOKorPassErr = function(res, next) {
	return function(err) {
		if(err) {
			next(err);
		} else {
			res.status(200).send();
		}
	};
};

module.exports.handleApiError = function(err, req, res, next) {
	if(err) {
		log.error(err);
		res.status(500).send("Error occurred");
	}
	next();
};

// return a copy of B (1 level deep only) with entries from A merged in
module.exports.mergeTo = function(a, b) {
	var bcopy = 
		Object.keys(b).reduce(function(result, key) {
			result[key] = b[key];
			return result;
		}, {});
	var merged =
		Object.keys(a).reduce(function(result, key) {
			result[key] = a[key];
			return result;
		}, bcopy);
	return merged;
};
