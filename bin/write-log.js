"use strict";

const fs   = require('fs'),
      fsp  = require('fs').promises,
      path = require('path');

const logWriteStream = fs.createWriteStream(path.join(__dirname, '..', 'logs', 'log.txt'), {
    highWaterMark: 10,
    // flags        : 'a'
});

setInterval(() => {
    logWriteStream.write(`${new Date().toISOString()} message 1000\n`);
}, 1000);

setInterval(() => {
    logWriteStream.write(`${new Date().toISOString()} message 900\n`);
}, 900);

setInterval(() => {
    logWriteStream.write(`${new Date().toISOString()} message 600\n`);
}, 600);