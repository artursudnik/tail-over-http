"use strict";

const path = require('path');

process.chdir(path.join(__dirname, '..'));

require('dotenv-defaults').config();

const log4js = require('log4js'),
      logger = log4js.configure(require('../conf/log4js')).getLogger('[www]');

logger.info('loading');
logger.info(`NODE_ENV=${process.env.NODE_ENV}`);
logger.info(`PID=${process.pid}`);

const app       = require('../app'),
      webserver = require('../lib/webserver');

app.init()
    .then((application) => webserver.start(application))
    .catch(err => {
        logger.fatal(`start up error`);
        logger.error(err);
        logger.warn('exiting process  after flushing logs');
        log4js.shutdown(() => process.exit(1));
    });

setShutdownRoutine();

function setShutdownRoutine() {
    const signals = {
        'SIGHUP' : 1,
        'SIGINT' : 2,
        'SIGTERM': 15
    };

    async function shutdown(signal) {
        let appShutdownPromise = app.shutdown();

        await webserver.stop();

        logger.info(`stopped`);
        logger.info(`waiting for application shutdown complete before exit`);

        await appShutdownPromise;

        process.on('exit', (code) => console.log(`exiting with code ${code}`));
        log4js.shutdown(() => process.exit(128 + signals[signal]));
    }

    Object.keys(signals).forEach((signal) => {
        process.on(signal, () => {
            logger.info(`process received a ${signal} (${signals[signal]}) signal`);
            shutdown(signal);
        });
    });

    process.on('uncaughtException', function (err) {
        logger.fatal(`Uncaught exception: ${err}`);
        logger.error(err);
        logger.warn('exiting process  after flushing logs');
        log4js.shutdown(() => process.exit(1));
    });

    process.on('unhandledRejection', function (err) {
        logger.fatal(`Unhandled rejection: ${err}`);
        logger.error(err);
        logger.warn('exiting process after flushing logs');
        log4js.shutdown(() => process.exit(1));
    });
}