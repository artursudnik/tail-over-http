"use strict";

const http = require('http');

const log4js = require('log4js'),
      logger = log4js.configure(require('../conf/log4js')).getLogger('[webserver]');

logger.debug('loading');

let server = http.createServer();

server.on('connection', connectionHandler);

const WEBSERVER_TIMEOUT           = parseInt(process.env.WEBSERVER_TIMEOUT);
const WEBSERVER_HEADERS_TIMEOUT   = parseInt(process.env.WEBSERVER_HEADERS_TIMEOUT);
const WEBSERVER_KEEPALIVE_TIMEOUT = parseInt(process.env.WEBSERVER_KEEPALIVE_TIMEOUT);

logger.info(`connections timeout set to ${WEBSERVER_TIMEOUT}ms`);
logger.info(`keepalive timeout set to ${WEBSERVER_KEEPALIVE_TIMEOUT}ms`);
logger.info(`headers timeout set to ${WEBSERVER_HEADERS_TIMEOUT}ms`);

if (WEBSERVER_HEADERS_TIMEOUT <= WEBSERVER_KEEPALIVE_TIMEOUT) {
    logger.warn('it is recommended to WEBSERVER_HEADERS_TIMEOUT have bigger value than WEBSERVER_KEEPALIVE_TIMEOUT');
}

server.keepAliveTimeout = WEBSERVER_KEEPALIVE_TIMEOUT;
server.timeout          = WEBSERVER_TIMEOUT;
server.headersTimeout   = WEBSERVER_HEADERS_TIMEOUT;

let getInstancePromiseResolve, getInstancePromiseReject;
let getInstancePromise = new Promise(((resolve, reject) => {
    getInstancePromiseResolve = resolve;
    getInstancePromiseReject  = reject;
}));

module.exports = {
    async start(app) {
        if (server.listening) {
            return Promise.reject(new Error('server is already running'))
        }

        logger.debug('starting');

        return new Promise((resolve, reject) => {
            server.on('error', err => {
                reject(err);
                getInstancePromiseReject(err);
            });
            server.on('listening', () => {
                server.on('request', app);
                logger.info(`started web server listening on port ${process.env.PORT} bind to ${process.env.BIND}`);
                logger.debug(`http://${process.env.BIND}:${process.env.PORT}/`);
                resolve(server);
                getInstancePromiseResolve(server);
            });
            server.listen(process.env.PORT, process.env.BIND);
        })
    },

    getInstance: async () => getInstancePromise,

    async stop() {
        if (!server.listening) {
            return Promise.reject(new Error('the server is not started'));
        }

        logger.info('stop routine started');

        return new Promise((resolve, reject) => {
            let shutdownTimeout;

            if (Object.keys(openConnections).length > 0) {
                logger.info(`${Object.keys(openConnections).length} connections still opened, waiting ${process.env.WEBSERVER_GRACEFUL_SHUTDOWN_TIMEOUT}ms`);

                shutdownTimeout = setTimeout(() => {
                    logger.info(`graceful shutdown period elapsed, closing ${Object.keys(openConnections).length} connections forcibly`);
                    Object.keys(openConnections).forEach((key) => {
                        openConnections[key].destroy();
                    })
                }, process.env.WEBSERVER_GRACEFUL_SHUTDOWN_TIMEOUT);
            } else {
                logger.debug(`no client connection(s) opened`);
            }

            server.close((err) => {
                clearTimeout(shutdownTimeout);
                if (err) {
                    return reject(err);
                }
                logger.info(`stopped`);
                setTimeout(resolve, 0); // resolving in the next event loop to give a chance socket on close event to be executed
            });
        })
    },
};

const openConnections = {};

function connectionHandler(socket) {
    logger.debug(`connection from ${socket.remoteAddress}:${socket.remotePort}`);

    const key = `${socket.remoteAddress}:${socket.remotePort}`;

    const start = new Date();

    openConnections[key] = socket;

    socket.on('close', (error) => {
        logger.debug(`connection from ${socket.remoteAddress}:${socket.remotePort} closed ${error ? 'with error' : ''}, ` +
            `br=${socket.bytesRead}, bw=${socket.bytesWritten}, elapsed=${new Date().getTime() - start.getTime()}`);
        delete openConnections[key];
    })
}