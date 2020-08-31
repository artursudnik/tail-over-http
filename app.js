"use strict";

const logger          = require('log4js').configure(require('./conf/log4js')).getLogger('[application]');
const loggerAccessLog = require('log4js').configure(require('./conf/log4js')).getLogger('[accessLog]');

const express     = require('express'),
      path        = require('path'),
      staticAsset = require('static-asset');

const app = express();

const startPromise = new Promise((resolve, reject) => {
    logger.debug('loading');
    resolve(app);
});

let shutdownMode = false,
    shutdownPromise;

module.exports = {
    async init() {
        logger.debug('starting');
        if (shutdownMode) {
            return Promise.reject(new Error('application is in shutdown mode, cannot initialize'));
        }
        return startPromise
    },

    async shutdown() {
        if (shutdownMode) {
            logger.warn('already in shutdown mode');
            return shutdownPromise;
        }

        shutdownMode = true;

        shutdownPromise = new Promise((resolve, reject) => {
            logger.debug('stopped');
            resolve();
        });

        return shutdownPromise;
    }
};

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.disable('etag');
app.disable('x-powered-by');

app.use(require('log4js').connectLogger(loggerAccessLog, {level: process.env.ACCESS_LOG_LEVEL}));

app.use(staticAsset(__dirname + "/public/"));
app.use(express.static(path.join(__dirname, 'public'), {immutable: true, maxAge: '1y'}));

app.use((req, res, next) => {
    res.setHeader('Cache-control', 'no-store');

    if (shutdownMode) {
        res.setHeader('Connection', 'close');
    }

    next();
});

app.use(require('./lib/middlewares/logRequestsProcessingTime'));

app.use(require('./routes'));

app.use((req, res) => {
    res.setHeader('Cache-control', 'no-store');
    logger.warn(`not found: original=${req.originalUrl} current=${req.url}`);
    res.status(404).render('404');
});

app.use((error, req, res, next) => {
    res.setHeader('Cache-control', 'no-store');
    res.status(500).render('error', {error: app.get('env') === 'development' ? error : {}});
});
