const WebSocket = require('ws');
const Binance = require('node-binance-api');
const config = require('config');
const winston = require('winston');

const websocketURL = 'wss://stream.binance.com:9443/stream?streams=';
const webSockets = [];


module.exports.binance = new Binance().options({
  APIKEY: config.util.getEnv('BinanceAPIKEY'),
  APISECRET: config.util.getEnv('BinanceAPISECRET'),
});


module.exports.registerOnClosedCandle = (tradingPair, callback) => {

  const url = websocketURL + `${tradingPair.toLowerCase()}@kline_1m`;

  winston.info(`Adding url to websocket ${url}`);
  
  const ws = new WebSocket(url);

  registerSocket(ws, callback);
}

function registerSocket(ws, callback) {
  ws.on('message', (msg) => {
    const { data } = JSON.parse(msg.toString());

    // if this is a closed kline, execute the callback with closed candle data
    if (data.k.x) callback(data.k);
  });
}