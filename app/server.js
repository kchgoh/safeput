'use strict';

var express = require('express');
var cnd = require('consolidate');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var config = require('./config');
var init = require('./init');

// NB: this assumes the current dir is the dir of the app. otherwise relative paths to like ./views won't work

var app = express();
app.engine('hbs', cnd.handlebars);
app.set('view engine', 'hbs');
app.set('views', config.viewsDir);
app.use(morgan('combined'));
app.use(bodyParser.json());	// client must submit with contentType json for this to work
app.use(bodyParser.urlencoded({extended:true}));
app.use('/static', express.static(config.resourcesDir));
app.use(require('./index'));

init.run(app);
