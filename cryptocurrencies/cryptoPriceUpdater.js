// controlls logic for connecting to ws on binance
// accept trading pair string and update one at a time
// max pairs in each ws is 200
const winston = require('winston');
const { CronJob } = require('cron');
const { CryptoPair } = require('../models/cryptoPairs');
const { registerOnClosedCandle } = require('../services/binanceAPI');

// should be more performant than using objects to store both values together
const TIMELINE_VALUES = [ '5m', '15m' ];
const TIMELINE_DIVISORS = [ 300_000, 900_000 ];

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
    
    registerOnClosedCandle(pairSymbol, handleClosedCandle);

    await CryptoPair.findOneAndUpdate({ s: pairSymbol }, { $set: { a: true } });

    winston.info(`Adding new cryptocurrency pair to websocket: ${pairSymbol}`);
  }, 15000);
}

// called once for every 1min close candle
async function handleClosedCandle({ t, T, s, o, c, h, l, v }) {
  console.log(`${s} ${t} ${c} `);

  const data = { t, T, o, c, h, l, v };

  let pusher = { $push: {} };
  pusher.$push["pd.1m"] = data;  
  
  pusher = updateNextTimeFrame(0, s, data, pusher);

  console.log(pusher);

  await CryptoPair.findOneAndUpdate({ s }, pusher);
}

function updateNextTimeFrame(index, s, data, pusher) {
  // if we are past the last timeFrame index, or not in a valid timeFrame block then return
  // this will prevent unnecessary calls for larger timeFrames
  // eg: a candle that does not close on a 5min timeFrame will not check if it closes on 15min or subsequent timelines

  console.log(`------ ${TIMELINE_DIVISORS.length} vs ${index} -- ${data.t} % ${TIMELINE_DIVISORS[index]} = ${(data.t % TIMELINE_DIVISORS[index])}`);

  if (TIMELINE_DIVISORS.length == index || (data.t % TIMELINE_DIVISORS[index]) !== 0) return pusher;

  console.log(`Adding to pusher ${TIMELINE_VALUES[index]}`);
  pusher.$push["pd." + TIMELINE_VALUES[index]] = data;

  return updateNextTimeFrame(index + 1, s, data, pusher);
}


// {
//   t: 1668837600000,
//   T: 1668837659999,
//   s: 'LTCBTC',
//   i: '1m',
//   f: 85643015,
//   L: 85643017,
//   o: '0.00374300',
//   c: '0.00374500',
//   h: '0.00374500',
//   l: '0.00374300',
//   v: '6.43200000',
//   n: 3,
//   x: true,
//   q: '0.02408159',
//   V: '6.27300000',
//   Q: '0.02348646',
//   B: '0'
// }
