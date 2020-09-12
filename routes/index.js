var express = require('express');
var countdownApi = require('./countdown');
var router = express.Router();
const {
  Auth,
  authenticator
} = require('./auth');
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
router.get('/topTags', async (req, res, next) => {
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

  return res.status(200).json({
    updated: updated,
    topTags: topTags
  });
});

/* 
var response = await this.pool.query(`
select array_agg(distinct tags)
from (
 select unnest(tags)
  from countdown_main
) as dt(tags);`); */
router.get('/tags', Auth, async (req, res, next) => {
  //get all tags;
  try{
  var response = await this.pool.query(`
  select * from countdown_tags`);
    res.status(200).json({"event":"success","data":response.rows});
  }catch(e)
  {
    res.status(503).json({"event":"error","error":503,"errorMessage":JSON.stringify(e)});
  }

});

router.get('/addTagAdmin/:tag', async (req, res, next) => {
  var tagToAdd = req.params.tag;
  if (req.headers.special != "angara61") return res.status(401).json({
    "error": true,
    "reason": "Authentication failed"
  });
  try {
    await new CountdownResQuery().addTag(this.pool, tagToAdd);
    return res.status(200).json({
      "event": "Success",
      "error": false,
      "data": "Tag added successfully"
    });
  } catch (e) {
    if (e.code == 23505) return res.status(409).json({
      "event": "Error",
      "error": "TAG_EXISTS",
      "errorMessage": "tag exists",
      "code": 409
    });
    return res.status(400).json({
      "event": "Error",
      "error": "UNDEFINED",
      "errorMessage": "not-defined",
      "errorMessage2": `${e}`
    })
  }
});

router.get('/addTag/:tag', Auth, async (req, res, next) => {
  //res.locals.token
  var tagToAdd = req.params.tag;
  try {
    await new CountdownResQuery().addTag(this.pool, tagToAdd);
    return res.status(200).json({
      "event": "Success",
      "error": false,
      "data": "Tag added successfully"
    });
  } catch (e) {
    if (e.code == 23505) return res.status(409).json({
      "event": "Error",
      "error": "TAG_EXISTS",
      "errorMessage": "tag exists",
      "code": 409
    });
    return res.status(400).json({
      "event": "Error",
      "error": "UNDEFINED",
      "errorMessage": "not-defined",
      "errorMessage2": `${e}`
    })
  }
});


router.post('/getPublicCountdowns', Auth, async (req, res, next) => {
  //TODO: checkAuth and shit
  console.log(req.body);
  console.time("query");
  var response = {};

  if (req.body.paginateKey) req.body = req.body.paginateKey;

  if (req.body)
    try {
      let options = {};
      if (req.body) {
        if (req.body.orderBy) options.orderBy = req.body.orderBy;
        if (req.body.searchKeyword) {
          options.searchKeyword = req.body.searchKeyword;
          if (req.body.searchIn) options.searchIn = req.body.searchIn;
        }
        if (req.body.limit) options.limit = parseInt(req.body.limit);
        if (req.body.asc) options.asc = false;
        if (req.body.removeDeleted) options.removeDeleted = (req.body.removeDeleted == true || req.body.removeDeleted.toLowerCase() == "true");
        else options.removeDeleted = null;
        if (req.body.removeExpired) options.removeExpired = (req.body.removeExpired == true || req.body.removeExpired.toLowerCase() == "true");
        else options.removeExpired = null;
        if (req.body.paginateKey) {
          let paginateKey;
          paginateKey = req.body.paginateKey;
          if (["expired_sort(expired)", "timestamp"].indexOf(paginateKey.type) != -1) paginateKey.key = parseInt(paginateKey.key);
          paginateKey.id = parseInt(paginateKey.id);
          console.log(paginateKey);
          options.paginateKey = paginateKey;
        }

      }
      
      var result = await new CountdownQuery().getCountdownsSortedAndFilteredPaginatedPublic(this.pool, options);
      result.dataLength = result.data.length;
      response.statusCode = 200;
      result.paginateKey = {
        paginateKey: result.paginateKey,
        orderBy: req.body.orderBy,
        searchKeyword: req.body.searchKeyword,
        searchIn: req.body.searchIn,
        limit: req.body.limit,
        asc: req.body.asc,
        removeDeleted: req.body.removeDeleted,
        removeExpired: req.body.removeExpired,
      }
      response.body = result;
      console.log(JSON.stringify(response));
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

router.get('/getPrivateCountdowns', Auth, async (req,res,next)=>{
    try{
      let options = {limit:100,removeExpired:false,orderBy:'expired_sort(expired)'};
      let user_id = res.locals.token.user_id;
      let result = await new CountdownQuery().getCountdownsSortedAndFilteredPaginatedByUser(this.pool, user_id, options);
      console.log(JSON.stringify(result));
      res.status(200).json({"event":"success","data":result.data,"dataLength":result.data.length});
    }catch(e)
    {
      console.log(e);
      res.status(503).json({"event":"error","error":503,"errorMessage":JSON.stringify(e)});
    }
});
router.get('/getUserCountdowns', Auth, async (req, res, next) => {
  //TODO: checkAuth and shit
  console.log(req.body);
  console.time("query");
  try {
    let options = {};
    if (req.body) {
      if (req.body.orderBy) options.orderBy = req.body.orderBy;
      if (req.body.searchKeyword) {
        options.searchKeyword = req.body.searchKeyword;
        if (req.body.searchIn) options.searchIn = req.body.searchIn;
      }
      if (req.body.limit) options.limit = parseInt(req.body.limit);
      if (req.body.asc) options.asc = false;
      if (req.body.removeDeleted) options.removeDeleted = (req.body.removeDeleted == true || req.body.removeDeleted.toLowerCase() == "true");
      else options.removeDeleted = null;
      if (req.body.removeExpired) options.removeExpired = (req.body.removeExpired == true || req.body.removeExpired.toLowerCase() == "true");
      else options.removeExpired = null;
      if (req.body.paginateKey) {
        let paginateKey;
        console.log(req.body.paginateKey);
        try {
          paginateKey = JSON.parse(req.body.paginateKey);
        } catch (e) {
          console.log(e);
          paginateKey = req.body.paginateKey; //propagate json parse error;
        }
        if (["expired_sort(expired)", "timestamp"].indexOf(paginateKey.type) != -1) paginateKey.key = parseInt(paginateKey.key);
        paginateKey.id = parseInt(paginateKey.id);
        console.log(paginateKey);
        options.paginateKey = paginateKey;
      }
    }
    if (!response.body) {
      let result = await new CountdownQuery().getCountdownsSortedAndFilteredPaginatedByUser(this.pool, response.user_id, options);
      response.statusCode = 200;
      result.dataLength = result.data.length;
      response.body = result;
    }
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

router.post('/newCountdown', Auth,async (req, res, next) => {
  //TODO: checkAuth and shit, re-use old code but have to implement countdown_users first with index on uid.
    //token is in res.locals.token
  var response = await new CountdownResQuery().insertCountdown(this.pool, req, res);
  console.log(response);
  if (!response.statusCode) response.statusCode = 500;
  let statusCode = response.statusCode;
  delete response.statusCode;
  res.status(statusCode).json(response.body);
});

router.post('/newPublicCountdown', async (req, res, next) => {
  //TODO: checkAuth and shit, re-use old code but have to implement countdown_users first with index on uid.
  let response = await authenticator(req, res, next);
  req.body.Status = "waiting";
  if (!response.body) {
    req.headers.token = response;
    response = await new CountdownResQuery().insertCountdown(this.pool, req, res, {
      status: "watiting"
    })
  };
  if (!response.statusCode) response.statusCode = 500;
  let statusCode = response.statusCode;
  delete response.statusCode;
  res.status(statusCode).json(response.body);
});

//TODO: verify working and add auth token check
router.post('/deleteCountdown', async (req, res, next) => {
  let response = await authenticator(req, res, next);
  //TODO: add auth.
  if (!response.body) response = await new CountdownResQuery().deleteCountdown(response, this.pool, req, res);
  if (!response.statusCode) response.statusCode = 500;
  let statusCode = response.statusCode;
  delete response.statusCode;
  console.log(response.body);
  res.status(statusCode).json(response.body);
});


//V3 - in progress
router.post('/updateCountdown', async (req, res, next) => {
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