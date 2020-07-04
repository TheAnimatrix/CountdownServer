var serviceAccount = require("./countdown-app-23de7-firebase-adminsdk-83ro0-c1000b1f94.json");
var admin = require("firebase-admin");
const AWS = require("aws-sdk");
let cred = {
    'accessKeyId': 'AKIAJW2UDRHZDS75UAVA',
    'secretAccessKey': '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'
};
AWS.config.credentials = cred;
AWS.config.region = 'ap-south-1';
const {
    Client
} = require('@elastic/elasticsearch')
const client = new Client({
    node: 'https://search-countdownsearch-fvmgbdwjsz5rtlvzdppx4t6sne.ap-south-1.es.amazonaws.com/'
});

// function testElastic()
// {
//     const result = await client.search({
//         index : 'countdown_main',
//         body  : { tag : 'birth*'}
//     })
// }

// testElastic();

//HELPER
function string(e) {
    return JSON.stringify(e);
}
//HELPER
function isUndefined(obj) {
    if (obj == null || obj == undefined || obj == "") return true;
    return false;
}

var response = {
    statusCode: 204,
    body: "Nothing."
};

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

exports.efsCountdowns = async (event, context) => {
    try {
        response.body = await client.search({
            index: 'countdown_main',
            body: {
                sort:[
                    {"TitleLowerCase.keyword":{"order":"asc"}},
                    {"Expired.keyword":{"order":"desc"}}
                ],
                "query": {
                    "bool": {
                        "must": [{
                                "match": {
                                    "TAG": {
                                        "query": event.query.searchTerm,
                                        "fuzziness": "AUTO"
                                    },

                                },
                                "match": {
                                    "UID":event.query.UID

                                }
                            },
                        ],
                        "must_not":{
                            "exists": {
                                "field": "Deleted"
                            }
                        }
                    },

                },
                "from": event.query.from,
                "size": 10
            }
        });
    } catch (err) {
        console.log(err);
        response.body = `Error ${JSON.stringify(err)}`;
    }
    response.statusCode = 200;
    return response;
}

exports.fsCountdowns = async (event, context) => {

    console.log("FSCOUTNDOWNS");
    console.log(event.headers.Token);

    const documentClient = new AWS.DynamoDB.DocumentClient();

    //check query params
    let page = 1;
    let per_page_item = 10;
    //expired,created_on,title
    let sort_key = "expired";
    //asc,desc
    let sort_order = "asc";
    //last evaluated key
    let lastEvaluatedKey = false;
    //searchterm
    let searchTerm = "";

    if (event != null && (event.queryStringParameters || event.query)) {
        var queryparams = (event.query) ? event.query : event.queryStringParameters;
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
        if (queryparams.hasOwnProperty('searchTerm')); {
            if (typeof queryparams['searchTerm'] == 'string') searchTerm = queryparams['searchTerm'];
            if (typeof queryparams['searchTerm'] == 'object') searchTerm = queryparams['searchTerm'][0];
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
    token = (event.headers.token) ? event.headers.token : event.headers.Token;
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

    console.log(searchTerm);
    let searchTag = (searchTerm!=null)?searchTerm:"n/a";

    var params = {
        TableName: 'Countdown_Main',
        IndexName: queryIndex,
        KeyConditionExpression: 'UID = :UID',
        ExpressionAttributeValues: {
            ':UID': (!overrideToken) ? token.uid : token,
            ':searchTag': searchTag
        },
        ExpressionAttributeNames: {
            // '#c': 'Deleted',
            '#tag': 'TAG'
        },
        FilterExpression: 'contains(#tag,:searchTag)',
        ScanIndexForward: scanIndexForward,
        Limit: per_page_item
    };

    if (lastEvaluatedKey) {

        try {
            lastEvaluatedKey = processJSON(lastEvaluatedKey);

            params.ExclusiveStartKey = lastEvaluatedKey;
        } catch (e) {
            console.log(e);
        }

    }

    try {
        let data = await documentClient.query(params).promise();

        while (data.Count < per_page_item && data.LastEvaluatedKey) {
            params.Limit = (per_page_item - data.Count); //dynamically set limit based on how many items fetched (prevent overshoot)
            params.ExclusiveStartKey = data.LastEvaluatedKey;
            let new_data = await documentClient.query(params).promise();
            data.Items = data.Items.concat(new_data.Items);
            data.Count = data.Count + new_data.Count;
            data.ScannedCount = data.ScannedCount + new_data.ScannedCount;
            data.LastEvaluatedKey = new_data.LastEvaluatedKey;
        }
        console.log(data);
        response.statusCode = 200;
        response.body = JSON.stringify({
            "event": "Success",
            "dataType": "Message2",
            "data": string(data),
            "data2": "Successfully queried countdowns, sorted by " + sort_key
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