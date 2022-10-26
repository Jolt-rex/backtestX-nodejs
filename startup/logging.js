const winston = require('winston');

module.exports = () => {
  // winston.add(new winston.transports.File({ filename: 'logfile.log' }));
  winston.add(new winston.transports.Console());
};