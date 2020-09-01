var socket = io({
    transports          : ['websocket'],
    reconnection        : true,             // whether to reconnect automatically
    reconnectionAttempts: Infinity,         // number of reconnection attempts before giving up
    reconnectionDelay   : 1,                // how long to initially wait before attempting a new reconnection
    reconnectionDelayMax: 5000,             // maximum amount of time to wait between reconnection attempts. Each attempt increases the reconnection delay by 2x along with a randomization factor
    randomizationFactor : 0
});

socket.on('reconnect_attempt', () => {
    socket.io.opts.transports = ['polling', 'websocket'];
});

const logContainer = document.getElementById('log');

let logLinesElementsBuffer = [];

const displayBufferedLogLinesDebounce = _.debounce(displayBufferedLogLines, 10);

socket.on('tail', (msg) => {
    const lines = msg.split(/\r?\n/).filter(line => line !== "");
    lines.forEach((line) => {
        logLinesElementsBuffer.push(createServerSideLineElement(line));
    })

    displayBufferedLogLinesDebounce();
});

function createServerSideLineElement(line) {
    const lineParagraph = document.createElement('p');

    lineParagraph.innerText = line;

    const knownLevels = ['INFO', 'DEBUG', 'WARN', 'ERROR', 'TRACE'];

    const match = line.match(new RegExp(`\\[(${knownLevels.join('|')})\\]`));

    if (match && knownLevels.indexOf(match[1]) >= 0) {
        lineParagraph.className = match[1].toLowerCase();
    }
    return lineParagraph;
}

function displayBufferedLogLines() {
    while (logLinesElementsBuffer.length > 0) {
        const lineParagraph = logLinesElementsBuffer.shift();
        logContainer.insertBefore(lineParagraph, logContainer.firstChild);
    }
    cleanLastLines();
}

function cleanLastLines() {
    while (logContainer.childElementCount > 1000) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

socket.on('error message', (msg) => {
    const lineParagraph     = document.createElement('p');
    lineParagraph.innerText = `[SERVER-SIDE ERROR!!!] ${new Date().toISOString()} ${msg}`;

    lineParagraph.className = 'streamError';

    logLinesElementsBuffer.push(lineParagraph);
    displayBufferedLogLinesDebounce();
});

socket.on('disconnect', () => {
    const lineParagraph     = document.createElement('p');
    lineParagraph.innerText = `[WARNING!!! DISCONNECTED] ${new Date().toISOString()}`;

    lineParagraph.className = 'streamError';

    logLinesElementsBuffer.push(lineParagraph);
    displayBufferedLogLinesDebounce();
});

socket.on('reconnecting', () => {
    const lineParagraph     = document.createElement('p');
    lineParagraph.innerText = `[RECONNECTING] ${new Date().toISOString()}`;

    lineParagraph.className = 'streamInfo';

    logLinesElementsBuffer.push(lineParagraph);
    displayBufferedLogLinesDebounce();
});

socket.on('reconnect', () => {
    const lineParagraph     = document.createElement('p');
    lineParagraph.innerText = `[RECONNECTED, CONTINUING STREAMING DATA] ${new Date().toISOString()}`;

    lineParagraph.className = 'streamSuccess';

    logLinesElementsBuffer.push(lineParagraph);
    displayBufferedLogLinesDebounce();
});

socket.on('connect', () => {
    const lineParagraph     = document.createElement('p');
    lineParagraph.innerText = `[CONNECTED] ${new Date().toISOString()}`;

    lineParagraph.className = 'streamSuccess';

    logLinesElementsBuffer.push(lineParagraph);
    displayBufferedLogLinesDebounce();
});