// controlls logic for connecting to ws on binance
// accept trading pair string and update one at a time
// max pairs in each ws is 200
const winston = require('winston');
const { CronJob, time } = require('cron');
const { CryptoPair } = require('../models/cryptoPairs');
const { registerOnClosedCandle, binance } = require('../services/binanceAPI');

// should be more performant than using objects to store both values together
const TIMELINE_VALUES = [ '5m', '15m', '30m', '1h', '2h', '4h', '12h', '1d', '1w' ];
const TIMELINE_DIVISORS = [ 300_000, 900_000, 1_800_000, 3_600_000, 7_200_000, 14_400_000, 43_200_000, 86_400_000, 604_800_000 ];

// TODO - keep temp values until we get a close candle of that value
// then push to db and reset values
const tempValues = {
};

module.exports.startSockets = () => {
  // start cron job
  const socketConnectionControllerJob = new CronJob('* * * * *', addSocketConnection);

  socketConnectionControllerJob.start();
}

// take next inactive pair from db and initiate socket connect
// && set trading pair to active
function addSocketConnection() {
  // wait 10 seconds into this minute to prevent overloading db and API
  setTimeout(async () => {
    // find the first inactive crypto pair to add
    const { _id, s } = await CryptoPair.findOne({ a: false }, { _id: 1, s: 1 });
    
    tempValues[s] = {};

    registerOnClosedCandle(s, handleClosedCandle);

    await loadHistoricalData(_id, s);

    await CryptoPair.findByIdAndUpdate( _id, { $set: { a: true } });
    
    winston.info(`Activated new cryptocurrency pair ${ s }`);
  }, 10000);
}

// called once for every 1min close candle
async function handleClosedCandle({ t, T, s, o, c, h, l, v, q }) {
  const data = { t, o: parseFloat(o), c: parseFloat(c), h: parseFloat(h), l: parseFloat(l), v: parseFloat(v), q: parseFloat(q) };
  
  let pusher = { $push: {} };
  pusher.$push["pd.1m"] = data;  
  
  updateTempValuesEveryMinute(s, data);
  pusher = updateNextTimeFrame(0, s, data, pusher, T + 1);

  await CryptoPair.findOneAndUpdate({ s }, pusher);
}

// if we are past the last timeFrame index, or not in a valid timeFrame block then return
// this will prevent unnecessary calls for larger timeFrames
// eg: a candle that does not close on a 5min timeFrame will not check if it closes on 15min or subsequent timelines
function updateNextTimeFrame(index, s, data, pusher, T) {
  const timeFrame = TIMELINE_VALUES[index];
  const timeDivisor = TIMELINE_DIVISORS[index];
  // only push data if we have a completed candle ie we have not started part way into the timeFrame
  // find this by subtracting timeFrame divisor from T time should give us the temp.t time
  if (TIMELINE_DIVISORS.length == index || (T % timeDivisor) !== 0)
    return pusher;

  if (T - timeDivisor !== tempValues[s][timeFrame].t) {
    tempValues[s][timeFrame] = null;
    return pusher;
  }
  
  pusher.$push["pd." + timeFrame] = tempValues[s][timeFrame];
  tempValues[s][timeFrame] = null;

  return updateNextTimeFrame(index + 1, s, data, pusher, T);
}

// update all timeFrame values for this symbol for every 1 minute closed candle
function updateTempValuesEveryMinute(s, data) {
  TIMELINE_VALUES.forEach(timeFrame => {
    // if the timeFrame has been reset, then add all the data
    if (!tempValues[s][timeFrame])
      tempValues[s][timeFrame] = data;
    // else update the data combining previous candle values
    else {
      tempValues[s][timeFrame].h = Math.max(tempValues[s][timeFrame].h, data.h);
      tempValues[s][timeFrame].l = Math.min(tempValues[s][timeFrame].l, data.l);
      tempValues[s][timeFrame].c = tempValues[s][timeFrame].c;
      tempValues[s][timeFrame].v = tempValues[s][timeFrame].v += data.v;
      tempValues[s][timeFrame].q = tempValues[s][timeFrame].q += data.q;
    }
  });
}

// takes _id of db cryptoPair and symbol to load historical candle data from
// binance API and push to db
// TODO : load previous candles - if > 0 : find open time of last candle, and load from that last candle only
// TODO : Load longer history of candles - may need multiple API calls 
// TODO : re-factor this function
async function loadHistoricalData(_id, s) {
  TIMELINE_VALUES.forEach(timeFrame => {
    winston.info(`Loading historical data for ${s} with ${timeFrame} time frame`);

    binance.candlesticks(s, timeFrame, async (error, ticks) => {
      if (error) {
        winston.error(`Error loading historical data for ${s} for ${timeFrame} - ${error}`);
        return;
      }

      
      const data = ticks.map(timeData => {
        const [t, o, h, l, c, v, T, q] = timeData;
        return { t, o: parseFloat(o), c: parseFloat(c), h: parseFloat(h), l: parseFloat(l), v: parseFloat(v), q: parseFloat(q) };
      });
      
      winston.info(`Loaded ${data.length} candles for ${s}`);

      let pusher = { $set: {} };
      pusher.$set[`pd.${timeFrame}`] = data;
      
      await CryptoPair.findByIdAndUpdate(_id, pusher);

    }, { limit: 1000 });
  });
}


// {
//   "e": "kline",     // Event type
//   "E": 123456789,   // Event time
//   "s": "BNBBTC",    // Symbol
//   "k": {
//     "t": 123400000, // Kline start time
//     "T": 123460000, // Kline close time
//     "s": "BNBBTC",  // Symbol
//     "i": "1m",      // Interval
//     "f": 100,       // First trade ID
//     "L": 200,       // Last trade ID
//     "o": "0.0010",  // Open price
//     "c": "0.0020",  // Close price
//     "h": "0.0025",  // High price
//     "l": "0.0015",  // Low price
//     "v": "1000",    // Base asset volume
//     "n": 100,       // Number of trades
//     "x": false,     // Is this kline closed?
//     "q": "1.0000",  // Quote asset volume
//     "V": "500",     // Taker buy base asset volume
//     "Q": "0.500",   // Taker buy quote asset volume
//     "B": "123456"   // Ignore
//   }
// }
