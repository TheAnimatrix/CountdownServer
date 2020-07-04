const AWS = require("aws-sdk");
const {
    PerformanceObserver,
    performance
} = require('perf_hooks');

let cred = {
    'accessKeyId': 'AKIAJW2UDRHZDS75UAVA',
    'secretAccessKey': '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'
};
AWS.config.credentials = cred;
AWS.config.region = 'ap-south-1';

const documentClient = new AWS.DynamoDB.DocumentClient();

let obj = {};
obj.uid = "adithya";
obj.email = "sgesg";
obj.last_countdown_timestamp = "12531252";

async function get() {
    var t0 = performance.now();
    var params = {
        TableName: 'Countdown_Users',
        Item: obj
    };

    try {
        let data = await documentClient.put(params).promise();
        console.log(string(data));
    } catch (e) {
        console.log(string(e));
    }

    var t1 = performance.now();

    console.log("get: " + (t1 - t0));
}

async function query() {

    var t0 = performance.now();

    var params = {
        TableName: 'Countdown_Main'
    };
    var data;
    try {
        data = await documentClient.scan(params).promise();
        console.log(string(data));
    } catch (e) {
        console.log(string(e));
    }

    var t1 = performance.now();

    for (let i = 0; i < data.Items.length; i++) {
        let changed_item = data.Items[i];
        delete changed_item.titleLowerCase;
        changed_item.TitleLowerCase = changed_item.Title.toLocaleLowerCase();

        var params = {
            TableName: 'Countdown_Main',
            Item: changed_item
        };

        documentClient.put(params).promise().catch((err) => {
            console.log(err);
        });
    }

    console.log("query: " + (t1 - t0));
}
query();


async function putUser(decodedToken) {

    const documentClient = new AWS.DynamoDB.DocumentClient();
    let user_obj = decodedToken;

    if (isUndefined(user_obj)) throw "PUTUSER:USER OBJ NULL";

    if (user_obj.hasOwnProperty('emailVerified')) {
        user_obj.isEmailVerified = user_obj.emailVerified;
        delete user_obj.emailVerified;
    }

    if (user_obj.hasOwnProperty('firebase')) delete user_obj.firebase;

    user_obj.last_countdown_timestamp = Date.now().toString();
    console.log(user_obj);
    var paramsInsert = {
        TableName: 'Countdown_Users',
        Item: user_obj
    };

    try {
        let t = await documentClient.put(paramsInsert).promise();
        console.log("t " + t);
        return true;
    } catch (err) {
        console.log(string(err) + " error in putUser first try cathch");
        return new Error2(string(err), "SERVER_ERR", undefined);
    }

}

let token = {
    "iss": "https://securetoken.google.com/countdown-app-23de7",
    "aud": "countdown-app-23de7",
    "auth_time": 1587923821,
    "user_id": "VNgGXNxyg9Pc8Ti2lnRf31G4fnG2",
    "sub": "VNgGXNxyg9Pc8Ti2lnRf31G4fnG2",
    "iat": 1587923821,
    "exp": 1587927421,
    "email": "zappo.fury@gmail.com",
    "email_verified": true,
    "firebase": {},
    "uid": "VNgGXNxyg9Pc8Ti2lnRf31G4fnG2"
};


// putUser(token).then((data)=>{
//     console.log("data "+string(data));
// }).catch((e)=>{
//     console.log("ERROR" + string(e));
// });
function string(e) {
    return JSON.stringify(e);
}

function isUndefined(obj) {
    if (obj == null || obj == undefined || obj == "") return true;
    return false;
}