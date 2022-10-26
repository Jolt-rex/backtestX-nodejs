const mongoose = require('mongoose');
const winston = require('winston');
const { CryptoPair } = require('../models/cryptoPairs');

const { binance } = require('../services/binanceAPI');

module.exports.updatePairsFromExchange = () => {
  binance.exchangeInfo( async (error, data) => {
    if (error) return;

    const pairsInDatabase = await CryptoPair.find();
    const { symbols: pairsFromServer } = data;

    // find pairs that have come from API, but are not already in the database
    const newPairs = pairsFromServer.filter(pairFromServer => !pairsInDatabase.find(pairFromDB => pairFromDB.s === pairFromServer.symbol));

    const parsedNewPairs = newPairs.map(pair => new CryptoPair({ s: pair.symbol, b: pair.baseAsset, q: pair.quoteAsset }));
    
    await CryptoPair.insertMany(parsedNewPairs);

    winston.info(`Added ${parsedNewPairs.length} new pairs to crypto trading pair list from exchange`);
  });  
}

module.exports.setAllPairsInactive = async () => {
  await CryptoPair.updateMany({}, { $set: { a: false } });
}