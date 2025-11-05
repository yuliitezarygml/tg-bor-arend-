const fs = require('fs');
const path = require('path');

// Создаём папку для логов если её нет
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const getLogFile = () => {
  const today = new Date().toISOString().split('T')[0];
  return path.join(logsDir, `${today}.log`);
};

const formatLog = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : '';
  return `[${timestamp}] [${level}] ${message}${dataStr}\n`;
};

const writeLog = (level, message, data = null) => {
  const logMessage = formatLog(level, message, data);
  const logFile = getLogFile();
  fs.appendFileSync(logFile, logMessage);
  
  // Также выводим в консоль
  const colors = {
    INFO: '\x1b[36m',    // Cyan
    SUCCESS: '\x1b[32m', // Green
    ERROR: '\x1b[31m',   // Red
    WARN: '\x1b[33m',    // Yellow
    DEBUG: '\x1b[35m',   // Magenta
    RESET: '\x1b[0m'
  };

  const color = colors[level] || colors.INFO;
  const prefix = `${color}[${level}]\x1b[0m`;
  console.log(`${prefix} ${message}`, data || '');
};

module.exports = {
  info: (msg, data) => writeLog('INFO', msg, data),
  success: (msg, data) => writeLog('SUCCESS', msg, data),
  error: (msg, data) => writeLog('ERROR', msg, data),
  warn: (msg, data) => writeLog('WARN', msg, data),
  debug: (msg, data) => writeLog('DEBUG', msg, data)
};
