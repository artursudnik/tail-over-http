"use strict";

const log4js = require('log4js'),
      logger = log4js.getLogger('[performance]');

function getDurationInMilliseconds(start) {
    const NS_PER_SEC = 1e9;
    const NS_TO_MS   = 1e6;
    const diff       = process.hrtime(start);

    return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS
}

const enabled = process.env.REPORT_RESPONSES_TIME && process.env.REPORT_RESPONSES_TIME.match(/(true|on|1)/);

const LONG_RESPONSE_TIME_TRESHOLD = parseInt(process.env.LONG_RESPONSE_TIME_TRESHOLD);

if (!LONG_RESPONSE_TIME_TRESHOLD) {
    throw new Error(`invalid LONG_RESPONSE_TIME_TRESHOLD value: ${process.env.LONG_RESPONSE_TIME_TRESHOLD}`)
}

logger.info(`reporting responses time ${enabled ? 'enabled' : 'disabled'}`);

if (enabled) {
    logger.info(`warning threshold set to ${LONG_RESPONSE_TIME_TRESHOLD}ms of response time duration`);
}

module.exports = function (req, res, next) {
    if (!enabled) {
        return next();
    }

    logger.debug(`${req.method} ${req.originalUrl} [STARTED]`);
    const start = process.hrtime();

    let finishedFired = false;

    res.on('finish', () => {
        finishedFired = true;

        const durationInMilliseconds = getDurationInMilliseconds(start);

        const message = `${req.method} ${req.originalUrl} [FINISHED] in ${durationInMilliseconds.toFixed(3)} ms`;

        if (durationInMilliseconds > LONG_RESPONSE_TIME_TRESHOLD) {
            logger.warn(message);
        } else {
            logger.debug(message);
        }
    });

    res.on('close', () => {
        if (finishedFired) {
            return;
        }
        const durationInMilliseconds = getDurationInMilliseconds(start);

        const message = `${req.method} ${req.originalUrl} [closed but not finished] in ${durationInMilliseconds.toFixed(3)} ms`;

        logger.warn(message);
    });

    next()
};

