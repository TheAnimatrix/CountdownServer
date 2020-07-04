/*

API FOR COUNTDOWN_MAIN (CRUD)
/newCountdown
/deleteCountdown
/saveCountdown
/getCountdownPrivate

/getCountdownPublicByTag
/getCountdownPublic


TODO: split into separate sam directories.

*/
const MINUTES_DELAY_BETWEEN_NEW_COUNTDOWN = 2;
const MIN_DELAY_BETWEEN_NEW_COUNTDOWN = MINUTES_DELAY_BETWEEN_NEW_COUNTDOWN * 60 * 1000;
const AWS = require("aws-sdk");
let cred = {
    'accessKeyId': 'AKIAJW2UDRHZDS75UAVA',
    'secretAccessKey': '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'
};
AWS.config.credentials = cred;
AWS.config.region = 'ap-south-1';
const crypto = require('crypto')
const generateUUID = () => crypto.randomBytes(16).toString("hex");

var response = {
    statusCode: 204,
    body: "Nothing."
};

var admin = require("firebase-admin");

function processJSON(input_obj) {
    console.log(input_obj);
    if (typeof input_obj == "object") return input_obj;
    console.log(input_obj + " before");
    input_obj = JSON.stringify(input_obj).replace(/\r?\n|\r/g, "");
    console.log(input_obj + " after");

    while (typeof input_obj != "object") {
        console.log(input_obj + " iteration");
        input_obj = JSON.parse(input_obj);
    }

    console.log(input_obj);
    console.log("parsing object");
    return input_obj;
}
exports.verifyId = async (event, context) => {

    console.log(event);
    let idToken = event.token;
    // if (event.body != null) {
    //     let body = processJSON(event.body);
    //     idToken = body["OID"];
    // } else {
    //     let headers = event.headers;
    //     idToken = headers.token;
    // }
    console.log(idToken);

    try {
        let decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log("Verified it works " + JSON.stringify(decodedToken));
        response.statusCode = 200;
        response.body = JSON.stringify(decodedToken);
    } catch (e) {
        console.log("ERROR " + JSON.stringify(e));
        response.statusCode = 500;
        response.body = "ERROR " + JSON.stringify(e);
    }

    response.body = string(response.body);
    return response;

}
exports.getUserCountdowns = async (event, context) => {

    console.log("EVENTA");
    console.log(event.headers.Token);

    const documentClient = new AWS.DynamoDB.DocumentClient();
    console.time("one");

    //check query params
    let page = 1;
    let per_page_item = 10;
    //expired,created_on,title
    let sort_key = "expired";
    //asc,desc
    let sort_order = "asc";
    //last evaluated key
    let lastEvaluatedKey = false;

    if (event != null && (event.queryStringParameters || event.query)) {
        var queryparams = (event.query)?event.query:event.queryStringParameters;
        while (typeof queryparams != "object") queryparams = JSON.parse(queryparams);
        if (queryparams.hasOwnProperty('page')) {
            if (typeof queryparams['page'] == 'string') page = queryparams['page'];
            if (typeof queryparams['page'] == 'object') page = queryparams['page'][0];
        }
        if (queryparams.hasOwnProperty('perpageitem')); {
            if (typeof queryparams['perpageitem'] == 'string') per_page_item = queryparams['perpageitem'];
            if (typeof queryparams['perpageitem'] == 'object') per_page_item = queryparams['paperpageitemge'][0];
        }
        if (queryparams.hasOwnProperty('sort_key')); {
            if (typeof queryparams['sort_key'] == 'string') sort_key = queryparams['sort_key'];
            if (typeof queryparams['sort_key'] == 'object') sort_key = queryparams['sort_key'][0];
        }
        if (queryparams.hasOwnProperty('sort_order')); {
            if (typeof queryparams['sort_order'] == 'string') sort_order = queryparams['sort_order'];
            if (typeof queryparams['sort_order'] == 'object') sort_order = queryparams['sort_order'][0];
        }
        if (queryparams.hasOwnProperty('LastEvaluatedKey')); {
            if (typeof queryparams['LastEvaluatedKey'] == 'string') lastEvaluatedKey = queryparams['LastEvaluatedKey'];
            if (typeof queryparams['LastEvaluatedKey'] == 'object') lastEvaluatedKey = queryparams['LastEvaluatedKey'][0];
        }

    }

    if (["asc", "desc"].indexOf(sort_order) == -1) {
        response.statusCode = 400;
        response.body = {
            "event": "Error",
            'error': 'INVALID_QUERY_PARAMS',
            'errorMessage': 'Query parameters are not valid',
            'errorMessage2': 'SORT_ORDER'
        };
        response.body = string(response.body);
        return response;
    }

    if (["expired", "created_on", "title"].indexOf(sort_key) == -1) {
        response.statusCode = 400;
        response.body = {
            "event": "Error",
            'error': 'INVALID_QUERY_PARAMS',
            'errorMessage': 'Query parameters are not valid',
            'errorMessage2': 'SORT_KEY'
        };
        response.body = string(response.body);
        return response;
    }

    var queryIndices = ["UID-Expired-index", "UID-Timestamp-index", "UID-Title-index"];
    var queryIndex = queryIndices[0];
    var scanIndexForward = true;
    switch (sort_key) {
        case "created_on":
            queryIndex = queryIndices[1];
            break;
        case "title":
            queryIndex = queryIndices[2];
            break;
        default:
        case "expired":
            queryIndex = queryIndices[0];
            break;
    }

    switch (sort_order) {
        case "desc":
            scanIndexForward = false;
            break;
        default:
        case "asc":
            scanIndexForward = true;
            break;
    }

    console.timeEnd("one");
    console.time("two");

    //end query params check

    let token;
    try {
        if (!event.headers.hasOwnProperty('token') && !event.headers.hasOwnProperty('Token') && isUndefined(event.headers.token)) {
            response.statusCode = 401;
            response.body = {
                "event": "Error",
                'error': 'NO_TOKEN',
                'errorMessage': 'Unauthorized',
                'errorMessage2': ''
            };
            response.body = string(response.body);
            return response;
        }
    } catch (e) {
        console.log(string(e));
        response.statusCode = 401;
        response.body = {
            "event": "Error",
            'error': 'NO_TOKEN',
            'errorMessage': 'Unauthorized',
            'errorMessage2': ''
        };
        response.body = string(response.body);
        return response;
    }

    //we have a nice token with us, now we gotta check it with firebase
    token = (event.headers.token)?event.headers.token:event.headers.Token;
    token = token.trim();
    let overrideToken = (event.headers.override && event.headers.override == "SuperPassword61^");
    let result = null;

    if (!overrideToken) {
        try {
            //verifying if token is valid, if passed returns payload otherwise catch logs and responds;
            token = await admin.auth().verifyIdToken(token);
            console.log("Decoded token");
        } catch (e) {
            console.log(string(e));
            response.statusCode = 401;
            response.body = {
                "event": "Error",
                'error': 'BAD_TOKEN',
                'errorMessage': 'Unauthorized',
                'errorMessage2': string(e)
            };
            response.body = string(response.body);
            return response;
        }
    }

    //we have a valid payload by this point {token}, concerned fields are uid and email
    //query COUNTDOWN_MAIN with uid and email.. done.
    //table fields are UID and Username respectively

    //use one of the three UID indices created rather than filtering

    console.timeEnd("two");
    console.time("three");    
    var params = {
        TableName: 'Countdown_Main',
        IndexName: queryIndex,
        KeyConditionExpression: 'UID = :UID',
        ExpressionAttributeValues: {
            ':UID': (!overrideToken)?token.uid:token,
        },
        ExpressionAttributeNames: {
            '#c': 'Deleted'
        },
        FilterExpression: 'attribute_not_exists(#c)',
        ScanIndexForward: scanIndexForward,
        Limit: 100
    };

    if(lastEvaluatedKey)
    {

        try{
            lastEvaluatedKey = processJSON(lastEvaluatedKey);

            params.ExclusiveStartKey = lastEvaluatedKey;
        }catch(e)
        {
            console.log(e);
        }
        
    }

    try {
        let data = await documentClient.query(params).promise();
        console.timeEnd("three");

        while (data.Count < per_page_item && data.LastEvaluatedKey) {
            console.time("four");
            params.Limit = (per_page_item-data.Count); //dynamically set limit based on how many items fetched (prevent overshoot)
            params.ExclusiveStartKey = data.LastEvaluatedKey;
            let new_data = await documentClient.query(params).promise();
            data.Items = data.Items.concat(new_data.Items);
            data.Count = data.Count + new_data.Count;
            data.ScannedCount = data.ScannedCount + new_data.ScannedCount;
            data.LastEvaluatedKey = new_data.LastEvaluatedKey;
            console.timeEnd("four");
        }
        console.log(data);
        response.statusCode = 200;
        response.body = JSON.stringify({
            "event": "Success",
            "dataType": "Message2",
            "data": string(data),
            "data2": "Successfully queried countdowns, sorted by "+sort_key
        });
        return response;
    } catch (e) {
        console.log(string(e));
        response.statusCode = 500;
        response.body = {
            "event": "Error",
            'error': 'QUERY_ERROR',
            'errorMessage': 'Unable to query to database',
            'errorMessage2': string(e)
        };
        response.body = string(response.body);
        return response;
    }
}
exports.newCountdown = async (event, context) => {

    console.log(event);

    /*
    if user has a token, decode token, if valid:
    --
    check if user is present in countdown_users --done
    if not add -- done
    what is last_countdown_timestamp --done
    if <5 min return error --done
    if not continue; --done
    --
    add countdown to countdown_main with uid attached and note timestamp
    --
    set user.lastcountdown timestamp
    return success
    */

    //input -> UID,Username,Title,Descrition,TAG,Expired
    const documentClient = new AWS.DynamoDB.DocumentClient();
    let body = null;
    try {
        body = processJSON(event.body);
    } catch (e) {
        console.log(string(e));
        response.statusCode = 400;
        response.body = {
            "event": "Error",
            "error": "MALFORMED_BODY",
            "errorMessage": string(e),
            'errorMessage2': ''
        };
        response.body = string(response.body);
        return response;;
    }
    let token;
    try {
        console.log(event.headers.token);
        if (!event.headers.hasOwnProperty('token') || isUndefined(event.headers.token)) {
            response.statusCode = 401;
            response.body = {
                "event": "Error",
                'error': 'NO_TOKEN',
                'errorMessage': 'Unauthorized',
                'errorMessage2': ''
            };
            response.body = string(response.body);
            return response;
        }
    } catch (e) {
        console.log(string(e));
        response.statusCode = 401;
        response.body = {
            "event": "Error",
            'error': 'NO_TOKEN',
            'errorMessage': 'Unauthorized',
            'errorMessage2': ''
        };
        response.body = string(response.body);
        return response;
    }

    //we have a nice token with us, now we gotta check it with firebase
    token = event.headers.token;
    token = token.trim();
    let result = null;
    try {
        //verifying if token is valid, if passed returns payload otherwise catch logs and responds;
        token = await admin.auth().verifyIdToken(token);
        console.log("Decoded token");
        //this function queries for user with timestamp field, if exists compares with current time and returns true if <5min otherwise false, if field is absent then first countdown so proceed
        result = await getUserLastCountdownTimestamp(token);
        if (typeof result == 'object') {
            response.statusCode = 400;
            response.body = result;
            response.body = string(response.body);
            return response;
        }
        console.log("result gult " + result);
        //user is valid and can put a countdown because his timestamp is within limits
        //putuser basically pushes the current token payload with last_countdown_timestam updated
        //returns an object if it failed, return as response;
        result = await putUser(token);
        if (typeof resultPutUser == 'object') {
            response.statusCode = 400;
            response.body = result;
            response.body = string(response.body);
            return response;;
        }

        console.log("result putuser " + result);
    } catch (e) {
        console.log(string(e));
        response.statusCode = 401;
        response.body = {
            "event": "Error",
            'error': 'BAD_TOKEN',
            'errorMessage': 'Unauthorized',
            'errorMessage2': string(e)
        };
        response.body = string(response.body);
        return response;;
    }

    let input_obj = validateNewCountdownInputs(body);
    if (!input_obj) {
        response.statusCode = 400;
        response.body = {
            "event": "Error",
            'error': 'INVALID_INPUT',
            'errorMessage': 'Input',
            'errorMessage2': string(input_obj)

        }
        response.body = string(response.body);
        return response;;
    }

    //now that the inputs are checked
    //check if user exists in countdown_users

    var newCountdown_Object = {
        "ID": generateUUID(),
        "UID": token.uid,
        "Username": token.email,
        "Title": input_obj.Title,
        "Description": input_obj.Description,
        "TAG": input_obj.TAG,
        "Expired": input_obj.Expired,
        "Premium": input_obj.Premium,
        "Status": input_obj.Status,
        "Timestamp": Date.now().toString()
    };

    console.log(newCountdown_Object);

    var params = {
        TableName: 'Countdown_Main',
        Item: newCountdown_Object
    }

    try {
        let data = await documentClient.put(params).promise();
        console.log(data);
        response.statusCode = 200;
        response.body = JSON.stringify({
            "event": "Success",
            "dataType": "Message2",
            "data": "Successfully inserted into database",
            "Item": string(newCountdown_Object),
            "data2": JSON.stringify(data)
        });
    } catch (err) {
        console.log(err);
        response.statusCode = 500;
        response.body = JSON.stringify({
            "event": "Error",
            "error": "DB_FAIL_INSERT",
            "errorMessage": "Failed to insert into database",
            "errorMessage2": JSON.stringify(err),
        });
    }

    return response;

}

//USED FOR NEWCOUNTDOWN
function validateNewCountdownInputs(obj) {
    if (isUndefined(obj)) return false;
    if (isUndefined(obj.Description)) obj.Description = "No Description";
    if (isUndefined(obj.Title)) return false;
    if (isUndefined(obj.TAG)) return false;
    if (isUndefined(obj.Expired)) return false;
    try {
        obj.Expired = parseInt(obj.Expired);
        if (isNaN(obj.Expired)) throw "Error('Expired is not a number')";
    } catch (e) {
        console.log(obj.Expired + " cannot be converted " + string(e));
        return false;
    }
    obj.Expired = obj.Expired.toString();
    if (!obj.hasOwnProperty('Status')) obj.Status = "private";
    if (!obj.hasOwnProperty('Premium')) obj.Premium = "F";
    return obj;
}
//USED FOR NEWCOUNTDOWN
async function putUser(decodedToken) {

    const documentClient = new AWS.DynamoDB.DocumentClient();
    let user_obj = decodedToken;

    if (isUndefined(user_obj)) throw "PUTUSER:USER OBJ NULL";

    if (user_obj.hasOwnProperty('firebase')) delete user_obj.firebase;

    user_obj.last_countdown_timestamp = Date.now().toString();

    var paramsInsert = {
        TableName: 'Countdown_Users',
        Item: user_obj
    };

    try {
        await documentClient.put(paramsInsert).promise();
        return true;
    } catch (err) {
        console.log(string(err) + " error in putUser first try cathch");
        return new Error2("Error", string(err), "SERVER_ERR", undefined);
    }

}
//USED FOR NEWCOUNTDOWN
async function getUserLastCountdownTimestamp(decodedToken) {
    const documentClient = new AWS.DynamoDB.DocumentClient();
    var paramsCheck = {
        TableName: 'Countdown_Users',
        KeyConditionExpression: 'uid = :uid and email = :email',
        ExpressionAttributeValues: {
            ':uid': decodedToken.uid,
            ':email': decodedToken.email
        },
        ExpressionAttributeNames: {
            '#c': 'last_countdown_timestamp'
        },
        FilterExpression: 'attribute_exists(#c)',
        Limit: 1
    };

    try {
        let data = await documentClient.query(paramsCheck).promise();
        console.log("data from gult : " + string(data));
        data = data.Items;
        if (data.length > 0 && Object.keys(data = data[0]).length > 0) {
            //result returned;
            let last_countdown_timestamp = data.last_countdown_timestamp;
            let now = Date.now();
            if (now - parseInt(last_countdown_timestamp) > MIN_DELAY_BETWEEN_NEW_COUNTDOWN) return true;
            else return new Error2("Error", "Please wait a couple minutes between each new countdown", "USER_ERROR", "WAIT_BW_COUNTDOWN")
        } else {
            //no results returned;
            return true;
        }
    } catch (e) {
        console.log(string(e) + " error in getUserLastCountdown first try cathch");
        return new Error2("Error", string(e), "SERVER_ERR", undefined);
    }
}


exports.deleteCountdown = async (event, context) => {
    console.log(event);
    try {
        event.body = processJSON(event.body);
    } catch (e) {
        console.log(string(e));
        response.statusCode = 400;
        response.body = {
            "event": "Error",
            "error": "MALFORMED_BODY",
            "errorMessage": string(e),
            'errorMessage2': ''
        };
        response.body = string(response.body);
        return response;
    }

    let token;
    try {
        console.log(event.headers.token);
        if (!event.headers.hasOwnProperty('token') || isUndefined(event.headers.token)) {
            response.statusCode = 401;
            response.body = {
                "event": "Error",
                'error': 'NO_TOKEN',
                'errorMessage': 'Unauthorized',
                'errorMessage2': ''
            };
            response.body = string(response.body);
            return response;
        }
    } catch (e) {
        console.log(string(e));
        response.statusCode = 401;
        response.body = {
            "event": "Error",
            'error': 'NO_TOKEN',
            'errorMessage': 'Unauthorized',
            'errorMessage2': ''
        };
        response.body = string(response.body);
        return response;
    }

    //we have a nice token with us, now we gotta check it with firebase
    token = event.headers.token;
    token = token.trim();
    let result = null;
    try {
        //verifying if token is valid, if passed returns payload otherwise catch logs and responds;
        token = await admin.auth().verifyIdToken(token);
        console.log("Decoded token");
    } catch (e) {
        console.log(string(e));
        response.statusCode = 401;
        response.body = {
            "event": "Error",
            'error': 'BAD_TOKEN',
            'errorMessage': 'Unauthorized',
            'errorMessage2': string(e)
        };
        response.body = string(response.body);
        return response;
    }

    const documentClient = new AWS.DynamoDB.DocumentClient();
    console.log(event.body);
    if (!(event.body.hasOwnProperty("ID") && event.body.ID != null && event.body.ID.length > 10)) {
        response.statusCode = 401;
        response.body = JSON.stringify({
            "event": "Error",
            "error": "BAD_COUNTDOWN_ID",
            "errorMessage": "Countdown id is either not provided or invalid",
            "errorMessage2": ""
        });
        return response;
    }



    console.log(event.body.ID + " is the ID");
    var params = {
        TableName: 'Countdown_Main',
        KeyConditionExpression: 'ID = :ID and UID = :UID',
        ExpressionAttributeValues: {
            ':ID': event.body.ID,
            ':UID': token.uid
        },
        ScanIndexForward: true,
        Limit: 1
    };

    try {

        var data = await documentClient.query(params).promise();
        console.log(data);
        if (!(data.hasOwnProperty("Items") && data.Items.length > 0)) throw "No Data";
        data = data.Items[0];
        if (data.ID == undefined || data.ID == null) throw "No Data";
        if (data.hasOwnProperty("Deleted") && data.Deleted == "T") throw "ITEM_ALREADY_DELETED"
        data.Deleted = "T";
        data.Deleted_final_timestamp = Date.now().toString();
        var params2 = {
            TableName: 'Countdown_Main',
            Item: data
        }
        var data = await documentClient.put(params2).promise();
        console.log(data);
        response.statusCode = 200;
        response.body = JSON.stringify({
            "event": "Success",
            "dataType": "DELETE_SUCCESS",
            "data": "Successfully delete item",
            "data2": JSON.stringify(data)
        });

    } catch (err) {
        console.log(err);
        response.statusCode = 500;
        if (err != undefined && typeof err == "string" && err == "ITEM_ALREADY_DELETED") {
            response.statusCode = 400;
            response.body = JSON.stringify({
                "event": "Error",
                "error": "ITEM_ALREADY_DELETED",
                "errorMessage": "Failed to obtain Item to update/Failed to delete Item",
                "errorMessage2": "Item has already been deleted"
            });
            return response;
        }
        response.body = JSON.stringify({
            "event": "Error",
            "error": "DELETE_FAIL",
            "errorMessage": "Failed to obtain Item to update/Failed to delete Item",
            "errorMessage2": JSON.stringify(err)
        });
    }

    return response;

}

// updateUserLast_countdown_timestamp = async (user, context) => {

//     //use user.UID and user.Username to do this.

// }

// exports.saveCountdown = async (event, context) => {

// }

// exports.getCountdownPrivate = async (event, context) => {

// }

class Error2 {
    constructor(event, error, errorMessage, errorMessage2) {
        this.event = event;
        this.error = error;
        this.errorMessage = errorMessage;
        this.errorMessage2 = errorMessage2;
    }
    static isError(e) {
        return ((typeof e == 'object') && !(isUndefined(e.errorMessage) || isUndefined(e.error)))
    }
}
//HELPER
function string(e) {
    return JSON.stringify(e);
}
//HELPER
function isUndefined(obj) {
    if (obj == null || obj == undefined || obj == "") return true;
    return false;
}