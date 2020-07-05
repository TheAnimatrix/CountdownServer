var express = require('express');
var countdownApi = require('./countdown');
var router = express.Router();
var authenticator = require('./auth').authenticator;
var filterCountdownApi = require('./filter');
const {
  CountdownQuery,
  CountdownData,
  CountdownResQuery,
  CountdownUser,
  CountdownUserData
} = require('./countdown2');
const {
  Pool
} = require('pg');
this.pool = new Pool({
  user: 'postgres',
  host: 'countdown-app.ctzuovwkz3jn.ap-south-1.rds.amazonaws.com',
  database: 'postgres',
  password: 'Angara61^',
  port: 5432,
});


//TODO: MAKE CONNECTION ON ROUTE INIT, don't create a new connection on query.start(); requires a new connection each time ?
//setup client pooling...

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', {
    title: 'Express'
  });
});

printHelloWorld = async (event, context) => {
  console.log("running print hello world");
  console.log(event.body);
  try {
    response = {
      statusCode: 200,
      message: "hello world"

    };
  } catch (err) {
    console.log(err);
    return err;
  }

  return response;
}

//V2
router.get('/topTags',async(req,res,next)=>{
  let topTags = [
    "anime",
    "manga",
    "game",
    "tvshow",
    "netflix",
    "vaccine"
  ];

  let updated = "7/4/2020"
  console.log("TAP TAGS LOADED");

  return res.status(200).json({updated:updated,topTags:topTags});
});

router.get('/getPublicCountdowns', async (req, res, next) => {

  let response = await authenticator(req,res,next);
  //TODO: checkAuth and shit
  console.log(req.query);
  console.time("query");

  if(!response.body)
  try {
    let options = {};
    if (req.query) {
      if (req.query.orderBy) options.orderBy = req.query.orderBy;
      if (req.query.searchKeyword) {
        options.searchKeyword = req.query.searchKeyword;
        if (req.query.searchIn) options.searchIn = req.query.searchIn;
      }
      if (req.query.limit) options.limit = parseInt(req.query.limit);
      if (req.query.asc) options.asc = false;
    if (req.query.removeDeleted) options.removeDeleted = (req.query.removeDeleted==true || req.query.removeDeleted.toLowerCase()=="true"); else options.removeDeleted=null;
      if (req.query.removeExpired) options.removeExpired = (req.query.removeExpired==true || req.query.removeExpired.toLowerCase()=="true"); else options.removeExpired=null;
      if (req.query.paginateKey) {
        let paginateKey;
        console.log(req.query.paginateKey);
        try {
          paginateKey = JSON.parse(req.query.paginateKey);
        } catch (e) {
          console.log(e);
          paginateKey = req.query.paginateKey; //propagate json parse error;
        }
        if (["expired_sort(expired)", "timestamp"].indexOf(paginateKey.type) != -1) paginateKey.key = parseInt(paginateKey.key);
        paginateKey.id = parseInt(paginateKey.id);
        console.log(paginateKey);
        options.paginateKey = paginateKey;
      }
      
    }
    var result = await new CountdownQuery().getCountdownsSortedAndFilteredPaginatedPublic(this.pool, options);
    result.dataLength=result.data.length;
    response.statusCode = 200; 
    response.body=result;
  } catch (e) {
    console.log(e);
    let code = 500;
    if (e && e.error && parseInt(e.error) < 500) code = 300;

    console.timeEnd("query");
    return res.status(code).json(e);
  }
  console.timeEnd("query");
  if (!response.statusCode) response.statusCode = 500;
  let statusCode = response.statusCode;
  delete response.statusCode;
  return res.status(statusCode).json(response.body);

});

router.get('/getUserCountdowns', async (req, res, next) => {

  let response = await authenticator(req,res,next);
  //TODO: checkAuth and shit
  console.log(req.query);
  console.time("query");
  try {
    let options = {};
    if (req.query) {
      if (req.query.orderBy) options.orderBy = req.query.orderBy;
      if (req.query.searchKeyword) {
        options.searchKeyword = req.query.searchKeyword;
        if (req.query.searchIn) options.searchIn = req.query.searchIn;
      }
      if (req.query.limit) options.limit = parseInt(req.query.limit);
      if (req.query.asc) options.asc = false;
      if (req.query.removeDeleted) options.removeDeleted = (req.query.removeDeleted==true || req.query.removeDeleted.toLowerCase()=="true"); else options.removeDeleted=null;
      if (req.query.removeExpired) options.removeExpired = (req.query.removeExpired==true || req.query.removeExpired.toLowerCase()=="true"); else options.removeExpired=null;
      if (req.query.paginateKey) {
        let paginateKey;
        console.log(req.query.paginateKey);
        try {
          paginateKey = JSON.parse(req.query.paginateKey);
        } catch (e) {
          console.log(e);
          paginateKey = req.query.paginateKey; //propagate json parse error;
        }
        if (["expired_sort(expired)", "timestamp"].indexOf(paginateKey.type) != -1) paginateKey.key = parseInt(paginateKey.key);
        paginateKey.id = parseInt(paginateKey.id);
        console.log(paginateKey);
        options.paginateKey = paginateKey;
      }
    }
    if(!response.body) {let result = await new CountdownQuery().getCountdownsSortedAndFilteredPaginatedByUser(this.pool, response.user_id, options);response.statusCode=200;result.dataLength=result.data.length;response.body=result;}
  } catch (e) {
    console.log(e);
    let code = 500;
    if (e && e.error && parseInt(e.error) < 500) code = 300;

    console.timeEnd("query");
    return res.status(code).json(e);
  }
  console.timeEnd("query");
  if (!response.statusCode) response.statusCode = 500;
  let statusCode = response.statusCode;
  delete response.statusCode;
  return res.status(statusCode).json(response.body);
});

router.post('/newCountdown', async (req, res, next) => {
  //TODO: checkAuth and shit, re-use old code but have to implement countdown_users first with index on uid.
  let response = await authenticator(req,res,next);
  if(!response.body) {req.headers.token=response;response = await new CountdownResQuery().insertCountdown(this.pool,req,res)};
  if (!response.statusCode) response.statusCode = 500;
  let statusCode = response.statusCode;
  delete response.statusCode;
  res.status(statusCode).json(response.body);
});

router.post('/newPublicCountdown', async (req, res, next) => {
  //TODO: checkAuth and shit, re-use old code but have to implement countdown_users first with index on uid.
  let response = await authenticator(req,res,next);
  req.body.Status = "waiting";
  if(!response.body) {req.headers.token=response;response = await new CountdownResQuery().insertCountdown(this.pool,req,res,{status:"watiting"})};
  if (!response.statusCode) response.statusCode = 500;
  let statusCode = response.statusCode;
  delete response.statusCode;
  res.status(statusCode).json(response.body);
});

//TODO: verify working and add auth token check
router.post('/deleteCountdown',async (req, res, next) => {
  let response = await authenticator(req,res,next);
  //TODO: add auth.
  if(!response.body) response = await new CountdownResQuery().deleteCountdown(response,this.pool,req,res);
  if(!response.statusCode) response.statusCode = 500;
  let statusCode = response.statusCode;
  delete response.statusCode;
  console.log(response.body);
  res.status(statusCode).json(response.body);
});


//V3 - in progress
router.post('/updateCountdown',async(req,res,next)=>{
  //what can you update?
  //for now leave it V1 -> no updating. you can set an existing countdown -> waiting
  //automated node program that runs through with a spam filter every n minutes -> private_forever similar to private but no upgrade possible
  //notify user?
  //set warning,warningtimestamp,warning_number
});


//V1 WORKS
router.post('/verifyId', async (req, res, next) => {
  var response = await countdownApi.verifyId(req, res);
  if (!response.statusCode) response.statusCode = 500;
  let statusCode = response.statusCode;
  delete response.statusCode;
  res.status(statusCode).json(response.body);
});

router.all('/printHelloWorld', async (req, res, next) => {
  var response = await printHelloWorld(req, res);
  if (!response.statusCode) response.statusCode = 500;
  let statusCode = response.statusCode;
  delete response.statusCode;
  res.status(statusCode).json(response.message);
});



module.exports = router;