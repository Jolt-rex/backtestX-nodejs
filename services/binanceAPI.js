const Binance = require('node-binance-api');
const config = require('config');

const binance = new Binance().options({
  APIKEY: config.util.getEnv('BinanceAPIKEY'),
  APISECRET: config.util.getEnv('BinanceAPISECRET'),
});

const websocketURL = 'wss://stream.binance.com:9443';

const WebSocket = require('ws');

// const websockets = [];
// var socketCount = 0;

// function addCryptoPair(symbolPair) {}

// const binanceWSAPI =
//   'wss://stream.binance.com:9443/stream?streams=ethbtc@kline_1m';

// const ws = new WebSocket(binanceWSAPI);

// ws.on('message', (msg) => {
//   const { data } = JSON.parse(msg.toString());

//   // if this is a closed kline
//   if (data.k.x) {
//     console.log(data.k);
//   }
// });

exports.binance = binance;