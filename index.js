const fs = require('fs');
const path = require('path');
const restify = require('restify');
const morgan = require('morgan');
const errors = require('restify-errors')
const corsMiddleware = require('restify-cors-middleware');
const config = require(`${process.cwd()}/config.json`);

const {PORT=7000, OUT_PATH='./upload'} = config;

const loggerConfig = {};
const {notification={}, logLevel="DEBUG", logFile="logger.log"} = loggerConfig;
const loggerOptions = {
  notification,
  logLevel,
  logFile
}

global.logger = require('./lib/logger')(loggerOptions);
logger = global.logger;

const cors = corsMiddleware({
  origins: ['*'],
});

const server = restify.createServer();
server.pre(cors.preflight);
server.use(cors.actual);
server.use(morgan('combined'));
server.use(restify.plugins.queryParser());
// server.use(restify.plugins.bodyParser());
// server.pre(restify.plugins.pre.context());

server.post('/sendFile/:fname', (req, res) => {
  logger.info(req.url);
  const targetFile = path.join(OUT_PATH, req.params.fname);
  const wStream = fs.createWriteStream(targetFile);
  logger.info(`inFile = ${req.params.fname} outFile = ${targetFile}`);
  req.pipe(wStream);
  req.on('end', reason => logger.info(`request end..`, reason));
  req.on('close', () => {
    logger.info(`request closed[${req.url}], destoryed = ${req.destroyed}`);
    if(req.destroyed){
      wStream.close();
    }
  }) 
  req.on('error', (error) => {
    logger.error(`request error[${req.url}], error = ${error}`);
    wStream.close();
  })
  wStream.on('finish', () => {
    logger.info(`finish: ${req.params.fname}`);
    res.send('done');
  })
  wStream.on('close', () => {
    logger.info('stream closed');
  });
});

server.on('InternalServer', function (req, res, err, cb) {
  logger.error('internal error occurred!');
  err.toString = function() {
    return 'an internal server error occurred!';
  };
  err.toJSON = function() {
    return {
      message: 'an internal server error occurred!',
      code: 'error'
    }
  };
  return cb();
});

server.on('restifyError', function (req, res, err, cb) {
  return cb();
});

server.listen(PORT, () => {
  logger.info(`outPath = ${OUT_PATH}`);
  logger.info(`listening ${server.name}: ${server.url}`);
});

process.on('warning', e => logger.warn(e.stack));