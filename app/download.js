'use strict';

var jwt = require('jsonwebtoken');
var config = require('./config');

function handleGetDownloadUrl(fileName, filePath, res, next) {
	var downloadToken = jwt.sign(
							{ fileName: fileName, filePath: filePath },
							config.jwtSecret,
							{ expiresIn: config.downloadTokenExpire }
						);
	res.json({url: "/download/" + downloadToken});
}

function handleGetDownloadFile(req, res, next) {
	var downloadToken = req.params.key;
	jwt.verify(downloadToken, config.jwtSecret, function(err, decoded) {
		if(err) {
			next("Download key invalid");
			return;
		}

		// 1st arg: actual file on server
		// 2nd arg: name that shows in the download header
		res.download(decoded.filePath, decoded.fileName, function(err) {
			if(err) {
				next(err);
				return;
			}
		});
	});
}

module.exports.handleGetUrl = handleGetDownloadUrl;
module.exports.handleDownloadFile = handleGetDownloadFile;
