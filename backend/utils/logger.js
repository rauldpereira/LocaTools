const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

// Configuração do arquivo de log com rotação
const transport = new winston.transports.DailyRotateFile({
  filename: path.join(__dirname, '../logs/auditoria-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '60d' // Mantém os logs por 60 dias
});

// Formato do log
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    transport
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;