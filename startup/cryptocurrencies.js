const { CronJob } = require('cron');
const winston = require('winston');
const { updatePairsFromExchange, setAllPairsInactive } = require('../cryptocurrencies/cryptoPairUpdater');
const { startSockets } = require('../cryptocurrencies/cryptoPriceUpdater');

function startCryptoPairUpdaterJob() {
  // update trading pairs at 1:16am every day. This time is used
  // as it should be the time of minimal other API or websocket
  // data being received
  const cryptoPairUpdaterJob = new CronJob(
    '16 1 * * *',
    updatePairsFromExchange
  );
  
  cryptoPairUpdaterJob.start();
}

// set all pairs to be inactive on startup
// in event of server disruption, all pairs will be 
// added to the websocket connection controller
module.exports = async () => {
  winston.info('Initialising cryptocurrency service');
  
  await setAllPairsInactive();
  winston.info('Trading pairs re-set');

  await updatePairsFromExchange();

  // production use
  // startCryptoPairUpdaterJob();
  
  startSockets();  
}

