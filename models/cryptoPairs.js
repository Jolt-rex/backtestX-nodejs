const mongoose = require('mongoose');

// s - symbol pair eg: BTCUSDT
// b - base asset eg: BTC
// q - quote asset eg: USDT
// a - active: default false
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
    }
  })
);

exports.CryptoPair = CryptoPair;
