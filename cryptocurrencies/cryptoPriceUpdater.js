// controlls logic for connecting to ws on binance
// accept trading pair string and update one at a time
// max pairs in each ws is 200
const winston = require('winston');
const { CronJob } = require('cron');
const { CryptoPair } = require('../models/cryptoPairs');
const { registerOnClosedCandle } = require('../services/binanceAPI');

const connectedPairs = new Set();

module.exports.startSockets = () => {
  // start cron job
  const socketConnectionControllerJob = new CronJob('* * * * *', addSocketConnection);

  socketConnectionControllerJob.start();
}

// take next inactive pair from db and initiate socket connect
// set trading pair to active
// TODO: download historical data before initialising socket
function addSocketConnection() {
  // wait 15 seconds into this minute to prevent overloading db and API
  setTimeout(async () => {
    // find the first inactive crypto pair to add
    const { s: pairSymbol } = await CryptoPair.findOne({ a: false }, { s: 1 });

    winston.info(`Adding socket connection with pair ${pairSymbol}`);
    
    registerOnClosedCandle(pairSymbol, handleClosedCandle);
    
    // update to active
    connectedPairs.add(pairSymbol);

    await CryptoPair.findOneAndUpdate({ s: pairSymbol }, { $set: { a: true } });

    winston.info(`Adding new cryptocurrency pair to websocket: ${pairSymbol}. Total pairs connected: ${connectedPairs.size}`);
  }, 15000);
}

function handleClosedCandle(candle) {
  console.log(candle);
}

