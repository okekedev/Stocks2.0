export function sendLog(ws, type, message, level = 'info') {
  ws.send(JSON.stringify({
    type: 'log',
    level,
    message,
    timestamp: new Date().toISOString(),
    logType: type
  }));
}

export function sendStatus(ws, type, status, data = {}) {
  ws.send(JSON.stringify({
    type: 'status',
    status,
    logType: type,
    ...data
  }));
}