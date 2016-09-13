'use strict';

var express = require('express');

var download = require('./download');
var auth = require('./auth').create({authBaseRoute: "/auth", appRoute: "/"});
var image = require('./image');
var util = require('./util');

var router = express.Router();

var apiRouter = express.Router();	// like a subtree. define routes within this, then attach this to a route under the main app
apiRouter.use(auth.verifyApi);	// not specify route means get hit for everything. use for decorate all calls, say logging. should call next() to continue url routing
apiRouter.use('/images', image.router);
apiRouter.use(util.handleApiError);	// error handling should be last in a component

router.use('/api', apiRouter);
router.all('/', [auth.verifyView, handleMainApp]);
router.use('/auth', auth.router);
router.get('/download/:key', download.handleDownloadFile);

function handleMainApp(req, res) {
	res.render('main', {
		bsaeRoute: "",
		authBaseRoute: "/auth",
	});
}

module.exports = router;
