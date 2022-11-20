const WebSocket = require('ws');
const Binance = require('node-binance-api');
const config = require('config');
const winston = require('winston');

const MAX_PAIRS_PER_SOCKET = 200;
const WEB_SOCKET_URL_PREFIX = 'wss://stream.binance.com:9443/stream?streams=';
const webSockets = [];
// webSockets is a list of web socket connections as per below
// {
//    connectionUrl: 'wss://stream.binance.com:9443/stream?streams=ethbtc@kline1m/linkusdt@kline1m',
//    ws: new WebSocket,
//    count: 0    
// }


module.exports.binance = new Binance().options({
  APIKEY: config.util.getEnv('BinanceAPIKEY'),
  APISECRET: config.util.getEnv('BinanceAPISECRET'),
});


module.exports.registerOnClosedCandle = (tradingPair, callback) => {
  // winston.info(`Adding ${tradingPair} to websockets`);

  addWebSocketConnection();
  updateLastSocketURL(tradingPair);
  registerLastSocket(callback);
  
  // webSockets.forEach(s => console.log(s.connectionUrl));
}


// takes in trading pair string in form of 'BTCUSDT'
// adds trading pair to webSockets list of object
// each webSockets object can have up to MAX_PAIRS_PER_SOCKET pairs
function addWebSocketConnection() {
  if (
    webSockets.length == 0 ||
    webSockets[webSockets.length - 1].count == MAX_PAIRS_PER_SOCKET
    ) {
      webSockets.push({
        connectionUrl: WEB_SOCKET_URL_PREFIX,
        count: 0,
      });
      
    // winston.info(`Added a new WebSocket connection - total connections ${webSockets.length}`);
  }
  
}

function updateLastSocketURL(tradingPair) {
  // add pair to last webSocket connection
  const lastSocket = webSockets[webSockets.length - 1];
  const parsedPair = `${tradingPair.toLowerCase()}@kline_1m`;
  
  lastSocket.connectionUrl += lastSocket.count > 0 ? '/' + parsedPair : parsedPair;
  lastSocket.count++;
  
  // winston.info(`Updated WebSocket at index ${webSockets.length - 1}: count: ${lastSocket.count} new connection url: ${lastSocket.connectionUrl}`);
}

function registerLastSocket(callback) {
  const wsReference = webSockets[webSockets.length - 1];
  if (wsReference.ws)
    wsReference.ws.close();

  wsReference.ws = new WebSocket(wsReference.connectionUrl);

  wsReference.ws.on('message', (msg) => {
    const { data } = JSON.parse(msg.toString());

    // if this is a closed kline, execute the callback with closed candle data
    if (data.k.x) callback(data.k);
  });
}