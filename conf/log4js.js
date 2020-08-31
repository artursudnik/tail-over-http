"use strict";

module.exports = {
    appenders : {
        stdout: {
            type: 'stdout',
        }
    },
    categories: {
        default: {
            appenders: ['stdout'],
            level    : process.env.LOG_LEVEL || 'INFO',
        },
    },
};
