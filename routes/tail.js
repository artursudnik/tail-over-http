"use strict";
const logger = require('log4js').configure(require('../conf/log4js')).getLogger('[tail]');

const asyncHandler = require('express-async-handler'),
      spawn        = require('child_process').spawn,
      express      = require('express'),
      path         = require('path'),
      router       = express.Router(),
      split2       = require('split2'),
      socketIo     = require('socket.io');

module.exports = router;


require('../lib/webserver').getInstance().then(server => {
    const io = socketIo(server, {
        pingInterval     : process.env.IO_PING_INTERVAL,
        pingTimeout      : process.env.IO_PING_TIMEOUT,
    });
    io.on('connection', (socket) => {
        logger.debug(`a user connected`);

        const tail = spawn("tail", ["-n", "50", "-f", process.env.LOG_FILE]);

        tail.on('error', (err) => {
            logger.error(`error spawning tail: ${err}`);
            socket.emit('error message', 'failed to start log stream');
        });

        tail.on('close', (code) => {
            if (code) {
                logger.error(`tail exited with code=${code}`);
                socket.emit('error message', 'log stream stopped unexpectedly');
            } else {
                logger.error(`tail exited with no exit code`);
                socket.emit('error message', 'log stream stopped unexpectedly');
            }
        });

        tail.stderr.on('data', (data) => {
            logger.error(data.toString());
        });

        tail.stdout.pipe(split2()).on('data', (data) => {
            socket.emit('tail', data.toString());
        });

        socket.on('disconnect', () => {
            logger.debug('user disconnected');
            tail.kill('SIGINT')
        });
    });
});

router.use((req, res, next) => {
    res.removeHeader('Cache-Control');
    next();
});

router.use(
    `/static/socket.io-client/${require('socket.io-client/package.json').version}`,
    express.static(path.join('node_modules', 'socket.io-client', 'dist'), {immutable: true, maxAge: '1y'})
);

router.get('/', asyncHandler((req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=0');
    res.render('tail', {
        pageTitle: 'Log stream.',
        libs     : {
            "socket.io-client": {
                version: require('socket.io-client/package.json').version,
                path   : `/tail/static/socket.io-client/${require('socket.io-client/package.json').version}/socket.io.js`
            }
        }
    })
}))