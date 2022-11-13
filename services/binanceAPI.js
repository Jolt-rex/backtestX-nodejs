const WebSocket = require('ws');
const Binance = require('node-binance-api');
const config = require('config');
const winston = require('winston');

const MAX_PAIRS_PER_SOCKET = 200;
const WEB_SOCKET_URL_PREFIX = 'wss://stream.binance.com:9443/stream?streams=';
const webSockets = [];
const socketsCount = 0;
// webSockets is a list of objects as per below
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

  const url = WEB_SOCKET_URL_PREFIX + `${tradingPair.toLowerCase()}@kline_1m`;

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

// takes in trading pair string in form of 'BTCUSDT'
// adds trading pair to webSockets list of object
// each webSockets object can have up to MAX_PAIRS_PER_SOCKET pairs
function addWebSocketConnection(tradingPair) {
  // if webSockets size == 0 or last element.count == 200
  if (
    webSockets.length == 0 ||
    webSockets[webSockets.length - 1].count == MAX_PAIRS_PER_SOCKET
  ) {
    webSockets.push({
      connectionUrl: WEB_SOCKET_URL_PREFIX,
      count: 0,
    });
  }
  
  // add pair to last webSocket connection
  let url = webSockets[webSockets.length - 1].connectionUrl;
  const parsedPair = `${tradingPair.toLowerCase()}@kline_1m`;

  url +=
    webSockets[webSockets.length - 1].count > 0
      ? '/' + parsedPair
      : parsedPair;
  
  reconnectLastSocket();
}

function reconnectLastSocket() {
  webSockets[webSockets.length - 1].ws.close();

}