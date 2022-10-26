const WebSocket = require('ws');
const Binance = require('node-binance-api');
const config = require('config');

const websocketURL = 'wss://stream.binance.com:9443/stream?streams=';

module.exports.binance = new Binance().options({
  APIKEY: config.util.getEnv('BinanceAPIKEY'),
  APISECRET: config.util.getEnv('BinanceAPISECRET'),
});

module.exports.getWebsocket = function(tradingPairs, previousUrl) {
  let url = previousUrl ? previousUrl : websocketURL;
  
  for (pair in tradingPairs)
    url += `/${pair.toLowerCase()}@kline_1m`;
  
  return new WebSocket(url);
}

module.exports.registerOnClosedCandle = function(ws, callback) {
  ws.on('message', msg => {
    const { data } = JSON.parse(msg.toString());

    // if this is a closed kline
    if (data.k.x)
      callback(data.k);
  });
}