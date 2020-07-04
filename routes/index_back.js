var express = require('express');
var countdownApi = require('./countdown');
var router = express.Router();
var filterCountdownApi = require('./filter');
const {CountdownQuery,CountdownData} = require('./countdown2');
const {Pool} = require('pg');
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



router.post('/verifyId', async (req, res, next) => {
  var response = await countdownApi.verifyId(req, res);
  if (!response.statusCode) response.statusCode = 500;
  let statusCode = response.statusCode;
  delete response.statusCode;
  res.status(statusCode).json(response.body);
});

router.get('/getUserCountdowns', async (req, res, next) => {
  // var response = await countdownApi.getUserCountdowns(req, res);
  // console.log(response);
  // if (!response || !response.statusCode) response.statusCode = 500;
  // let statusCode = response.statusCode;
  // delete response.statusCode;
  // res.status(statusCode).send(response.body);

  const countdownQuery = await new CountdownQuery();
  console.log(req.query);
  console.time("query");
  try{
    let options = {};
  let prevKey = !req.query?null:req.query.prevKey;
  if(prevKey)
  {
    try{
    prevKey = JSON.parse(prevKey);
    }catch(e)
    {
      prevKey = req.query.prevKey;
    }
    if(["expired","timestamp"].indexOf(prevKey.type)!=-1)prevKey.key = parseInt(prevKey.key);
    prevKey.id = parseInt(prevKey.id);
    options.prevKey = prevKey;
  }
  if(req.query && req.query.searchKeyword)
  {
    options.searchKeyword = req.query.searchKeyword;
    if(req.query.searchIn) options.searchIn = req.query.searchIn;
  }

  options.limit = 10;
  options.removeExpired= null;
  var result = await countdownQuery.getCountdownsSortedAndFilteredPaginatedPublic(this.pool,options);
}catch(e)
{
  console.log(e);
  let code = 500;
  if(e && e.error && parseInt(e.error)<500) code = 300;
  
  console.timeEnd("query");
  return res.status(code).json(e);
}
  console.timeEnd("query");
  //console.log(result);
  res.status(200).json(result);

});

router.post('/newCountdown', async (req, res, next) => {
  var response = await countdownApi.newCountdown(req, res);
  if (!response.statusCode) response.statusCode = 500;
  let statusCode = response.statusCode;
  delete response.statusCode;
  res.status(statusCode).json(response.body);
});

router.post('/deleteCountdown', async (req, res, next) => {
  var response = await countdownApi.deleteCountdown(req, res);
  if (!response.statusCode) response.statusCode = 500;
  let statusCode = response.statusCode;

  console.log(response);
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

//fs -> filter and sort
router.get('/fsCountdowns', async (req,res,next)=>{
  var response = await filterCountdownApi.fsCountdowns(req, res);
  console.log(response);
  if (!response || !response.statusCode) response.statusCode = 500;
  let statusCode = response.statusCode;
  delete response.statusCode;
  res.status(statusCode).send(response.body);
});

router.get('/efsCountdowns', async (req,res,next)=>{
  var response = await filterCountdownApi.efsCountdowns(req, res);
  console.log(response);
  if (!response || !response.statusCode) response.statusCode = 500;
  let statusCode = response.statusCode;
  delete response.statusCode;
  res.status(statusCode).send(response.body);
});

module.exports = router;