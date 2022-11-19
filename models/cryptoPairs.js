const mongoose = require('mongoose');

// s - symbol pair eg: BTCUSDT
// b - base asset eg: BTC
// q - quote asset eg: USDT
// a - active: default false
// pd - prices data
const CryptoPair = mongoose.model(
  'CryptoPair',
  new mongoose.Schema({
    s: {
      type: String,
      min: 2,
      max: 20,
      required: true
    },
    b: {
      type: String,
      min: 1,
      max: 10,
      required: true
    },
    q: {
      type: String,
      min: 1,
      max: 10,
      required: true
    },
    a: {
      type: Boolean,
      required: true,
      default: false
    },
    pd: {
      type: Object,
      required: true,
      default: {
        '1m': [],
        '5m': [],
        '15m': [],
        '30m': [],
        '1h': [],
        '2h': [],
        '4h': [],
        '6h': [],
        '8h': [],
        '12h': [],
        '1d': [],
        '1w': [],
        '1M': []
      }
    }
  })
);

exports.CryptoPair = CryptoPair;
