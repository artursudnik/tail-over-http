"use strict";

const fs   = require('fs'),
      fsp  = require('fs').promises,
      path = require('path');

const logWriteStream = fs.createWriteStream(path.join(__dirname, '..', 'logs', 'log.txt'), {
    highWaterMark: 10,
    // flags        : 'a'
});

setInterval(() => {
    logWriteStream.write(`[${new Date().toISOString()}] [${getRandomLevel()}] message 1000\n`);
}, 1000);

setInterval(() => {
    logWriteStream.write(`[${new Date().toISOString()}] [${getRandomLevel()}] message 900\n`);
}, 900);

setInterval(() => {
    logWriteStream.write(`[${new Date().toISOString()}] [${getRandomLevel()}] message 600\n`);
}, 600);

function getRandomLevel() {
    const levels = [
        'INFO', 'DEBUG', 'WARN', 'ERROR', 'TRACE'
    ];

    const randomIndex = Math.floor(Math.random() * levels.length);

    return levels[randomIndex];
}