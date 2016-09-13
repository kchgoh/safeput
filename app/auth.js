'use strict';

var jwt = require('jsonwebtoken');
var express = require('express');
var async = require('async');
var bcrypt = require('bcryptjs');

var log = require('./logger');
var userDAO = require('./user-dao');
var util = require('./util');

function Auth(options) {
	var self = this;

	options = options || {};
	this.config = options.config || require('./config');
	this.authBaseRoute = options.authBaseRoute || "";
	this.appRoute = options.appRoute || "/";

	this.handleShowLoginPage = function(req, res) {
		res.render('login', {
			appRoute: self.appRoute,
			authBaseRoute: self.authBaseRoute,
		});
	};

	this.redirectToLogin = function(res) {
		log.info("redirect to login");
		res.locals.appRoute = self.appRoute;
		res.locals.authBaseRoute = self.authBaseRoute;
		res.redirect(self.authBaseRoute + "/login");
	};

	this.handleLogout = function(req, res) {
		const token = req.headers['x-access-token'];
		if(!token) {
			log.info("no token");
			res.status(401).send();
			return;
		}
		jwt.verify(token, self.config.jwtSecret, function(err, decoded) {
			if(err) {
				log.error("bad token");
				log.error(err);
				res.status(401).send();
				return;
			}
			log.log("token ok!");

			const username = decoded.username;

			userDAO.setRefreshToken(username, null, function(err) {
				if(err) {
					log.error("Error clearing refresh token. Allow log out anyway.");
					log.error(err);
				}
				res.status(200).send();
				log.info("Logged out " + username);
			});
		});
	};

	this.onCompleteAuth = function(res, data) {
		res.json(data);
	};

	var genAccessToken = function(username) {
		log.info("Generateing new access token for " + username);
		return jwt.sign( { username: username }, self.config.jwtSecret, { expiresIn: self.config.accessTokenExpire } );
	};

	var genRefreshToken = function(username, cb) {
		log.info("Generating new refresh token for " + username);
		const refreshToken = jwt.sign( { username: username }, self.config.jwtSecret, { expiresIn: self.config.refreshTokenExpire } );

		userDAO.setRefreshToken(username, refreshToken, function(err) {
			if(err) {
				log.error("Failed to persist refresh token");
				log.error(err);
				cb("Failed");
				return;
			}
			cb(null, refreshToken);
		});
	};

	this.handleAuthenticate = function(req, res, next) {	// ... take username and pass from req, find user from db, compare password, if ok, call create
		const username = req.body.username;
		const password = req.body.password;

		userDAO.getEncPassword(username, function(err, encPwd) {
			if(err) {
				log.error("Error retrieving password for " + username);
				next(err);
				return;
			}
			if(!encPwd) {
				log.info("User " + username + " not found");
				res.status(401).send("Wrong user or password");
				return;
			}

			verifyPassword(password, encPwd, function(err, ok) {
				if(err) {
					next(err);
					return;
				}
				if(!ok) {
					log.info(username + " wrong password");
					res.status(401).send("Wrong user or password");
					return;
				}
				genTokensAndRespond(username, res);
			});
		});
	};

	var verifyPassword = function(password, encPwd, cb) {
		if(!encPwd) {
			cb(null, false);
			return;
		}
		bcrypt.compare(password, encPwd, cb);
	};

	var genTokensAndRespond = function(username, res) {
		const accessToken = genAccessToken(username);
		genRefreshToken(username, function(err, refreshToken) {
			if(err) {
				self.onCompleteAuth(res, {
					login: true,
					accessToken: accessToken,
				});
				return;
			}

			self.onCompleteAuth(res, {
				login: true,
				accessToken: accessToken,
				refreshToken: refreshToken,
			});
		});
	};

	this.verifyApi = function(req, res, next) {	// unlike verifyView, for API we either pass the call, or reject with unauthorised. no need to redirect etc
		log.info("verifying api");

		const token = req.headers['x-access-token'];
		if(!token) {
			log.info("no token");
			res.status(401).send();
		}
		jwt.verify(token, self.config.jwtSecret, function(err, decoded) {
			if(err) {
				if(err.name === "TokenExpiredError") {	// this specific error name is specified in the API
					log.info("expired token");
					res.status(401).send();
					return;
				}
				log.info("bad token");
				log.info(err);
				res.status(401).send();
				return;
			}
			log.info("token ok!");
			next();
		});
	};

	this.onNoTokenView = function(req, res) {
		self.redirectToLogin(res);
	};

	this.verifyView = function(req, res, next) {
		console.log("console - verifying view")
		log.info("verifying view");

		const accessToken = req.body.access_token || req.headers['x-access-token'];
		if(!accessToken) {
			log.info("no token");
			self.onNoTokenView(req, res);
			return;
		}
		jwt.verify(accessToken, self.config.jwtSecret, function(err, decoded) {
			if(err) {
				if(err.name === "TokenExpiredError") {	// this specific error name is specified in the API
					log.info("expired token");
					// if request also contains a refresh token (eg user refresh page), then try refresh with it
					// NOTE HOWEVER there is a caveat with this flow - when user refresh, browser always resends
					// the form post values (tokens) in the initial page load. the new tokens rendered here after
					// the refresh are NOT used in subsequent refreshes. so once the initial refresh token expires,
					// OR, if user did any other action that renews the refresh token on server side, then
					// refresh (with the original tokens) will no longer work and booted back to login screen.
					const refreshToken = req.body.refresh_token || req.headers['x-refresh-token'];
					if(!refreshToken) {
						self.redirectToLogin(res);
						return;
					}
					log.info("trying refresh token");
					verifyRefreshToken(refreshToken, function(err, username) {
						if(err) {
							self.redirectToLogin(res);
							return;
						}
						res.locals.accessToken = genAccessToken(username);
						res.locals.refreshToken = refreshToken;
						// tokens will get rendered in the view
						// finally, continue url handling
						next();
					});
					return;
				}
				log.info("bad token");
				log.info(err);
				self.redirectToLogin(res);
				return;
			}

			log.info("token ok!");

			userDAO.getRefreshToken(decoded.username, function(err, refreshToken) {
				if(err || !refreshToken) {
					log.error("Failed to retrieve refresh token for " + decoded.username
								+ ". Re-login will be needed after access token expires");
				} else {
					res.locals.refreshToken = refreshToken;
				}
				res.locals.accessToken = accessToken;
				// tokens will get rendered in the view

				// finally, continue url handling
				next();
			});
		});
	};

	// callback arg 1: err; arg 2: username extracted from token
	var verifyRefreshToken = function(refreshToken, cb) {
		if(!refreshToken) {
			cb("Missing token");
			return;
		}
		jwt.verify(refreshToken, self.config.jwtSecret, function(err, decoded) {
			if(err) {
				log.info("bad or expired token.");
				log.info(err);
				cb("Refresh token failed");
				return;
			}
			userDAO.getRefreshToken(decoded.username, function(err, storedToken) {
				if(err) {
					log.error("error retrieving stored refresh token. Cannot allow refresh.");
					log.error(err);
					cb("Refresh token failed");
					return;
				}
				if(!storedToken) {
					log.error("no stored token found");
					cb("Refresh token failed");
					return;
				}
				if(storedToken !== refreshToken) {
					log.error("submitted token not match stored token");
					cb("Refresh token failed");
					return;
				}

				cb(null, decoded.username);
			});
		});
	};	

	this.handleRefreshToken = function(req, res, next) {
		const refreshToken = req.headers['x-refresh-token'];
		verifyRefreshToken(refreshToken, function(err, username) {
			if(err) {
				res.status(401).send(err);
				return;
			}

			genTokensAndRespond(username, res);
		});
	};

	this.handleCreateUser = function(req, res, next) {
		const username = req.body.username;
		const password = req.body.password;
		const sitePass = req.body.sitePass;

		// if want to temporary disable all new creation, then just remove it from config
		if(!self.config.sitePass) {
			log.info("Create user not allowed as not site pass defined");
			res.status(403).send();
			return;
		}
		if(sitePass !== self.config.sitePass) {
			res.status(401).send("Wrong site pass");
			return;
		}

		var checkUserNotExist = function(cb) {
			userDAO.getUser(username, function(err, user) {
				if(err) {
					cb(err);
					return;
				}
				if(user) {
					cb({skip:true, message:"User already exists"});
					return;
				}
				cb();
			});
		};
		var hashPassword = function(cb) {
			bcrypt.hash(password, 10, function(err, encPwd) {
				if(err) {
					log.error("Hash password failed");
					log.error(err);
					cb(err);
					return;
				}
				cb(null, encPwd);
			});
		};
		var createUserInDb = function(encPwd, cb) {
			userDAO.create(username, encPwd, function(err) {
				if(err) {
					log.error("Persist user failed");
					log.error(err);
					cb(err);
					return;
				}
				cb();
			});
		};
		var onComplete = function(err, result) {
			if(err) {
				if(err.skip) {
					res.status(500).send(err.message);
					return;
				}
				next(err);
				return;
			}
			res.json({message: "Created successfully"});
			log.info("Created " + username);
		};

		async.waterfall([
			checkUserNotExist,
			hashPassword,
			createUserInDb,
		], onComplete);
	};

	var verifyUserAndAction = function(username, password, action, res, next) {
		var getUserPass = function(cb) {
			userDAO.getEncPassword(username, function(err, encPwd) {
				if(err) {
					cb(err);
					return;
				}
				if(!encPwd) {
					log.info("User " + username + " not found");
					cb({skip: true, message: "Wrong user or password"});
					return;
				}
				cb(null, encPwd);
			});
		};

		var verifyUserPass = function(encPwd, cb) {
			verifyPassword(password, encPwd, function(err, ok) {
				if(err) {
					cb(err);
					return;
				}
				if(!ok) {
					log.info(username + " wrong password");
					cb({skip: true, message: "Wrong username or password"});
					return;
				}
				cb();
			});
		}

		var onComplete = function(err, result) {
			if(err) {
				// there's no "break" in the middle of a series, so as a workaround
				// use the error flow but add a flag to indicate "not really a system error"
				if(err.skip) {
					res.status(401).send(err.message);
					return;
				}
				next(err);
				return;
			}
			res.json({message: "Success"});
		};

		async.waterfall([
			getUserPass,
			verifyUserPass,
			action,
		], onComplete);
	};

	this.handleUpdateUser = function(req, res, next) {
		const username = req.body.username;
		const password = req.body.password;
		const newPassword = req.body.newPassword;

		var persistPasswordHash = function(cb) {
			bcrypt.hash(newPassword, 10, function(err, encPwd) {
				if(err) {
					cb(err);
					return;
				}
				userDAO.changePassword(username, encPwd, function(err) {
					if(err) {
						cb(err);
						return;
					}
					log.info("Updated user " + username);
					cb();
				});
			});
		};

		verifyUserAndAction(username, password, persistPasswordHash, res, next);
	};

	this.handleDeleteUser = function(req, res, next) {
		const username = req.body.username;
		const password = req.body.password;

		verifyUserAndAction(username, password, function(cb) {
			userDAO.del(username, function(err) {
				if(err) {
					cb(err);
					return;
				}
				log.info("Deleted user " + username);
				cb();
			});
		}, res, next);
	};

	this.router = express.Router();
	this.router.get('/login', this.handleShowLoginPage);
	this.router.post('/authenticate', this.handleAuthenticate);	// input username and pass, return access token and refresh token
	this.router.post('/logout', this.handleLogout);
	this.router.post('/refresh-token', this.handleRefreshToken);	// input refresh token, return new access token and refresh token
	this.router.post('/users', this.handleCreateUser);
	this.router.post('/users/delete', this.handleDeleteUser);	// i also need a password in the request when delete user. but having a request body is not standard for HTTP DELETE
	this.router.post('/users/update', this.handleUpdateUser);
	this.router.use(util.handleApiError);
}

module.exports.create = function(options) {
	return new Auth(options);
}

