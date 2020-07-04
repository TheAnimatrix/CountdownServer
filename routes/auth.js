
var admin = require('firebase-admin');

var authenticator = async function(req)
{
// 2. check if header["token"] exists
let response = {};
{
    if (!req.headers.hasOwnProperty('token') || !req.headers.token) {
        response.statusCode = 401;
        response.body = {
            "event": "Error",
            'error': 'NO_TOKEN',
            'errorMessage': 'Unauthorized',
            'errorMessage2': ''
        };
        return response;
    }

}
//3. we have a nice token with us, now we gotta check it with firebase
let token = req.headers.token;
token = token.trim();
{

    try {
        //verifying if token is valid, if passed returns payload otherwise catch logs and responds;
        token = await admin.auth().verifyIdToken(token);
        console.log("Decoded token ");
        //this function queries for user with timestamp field, if exists compares with current time and returns true if <5min otherwise false, if field is absent then first countdown so proceed
        return token;
    } catch (e) {
        console.log(e);
        response.statusCode = 401;
        response.body = {
            "event": "Error",
            'error': 'BAD_TOKEN',
            'errorMessage': 'Unauthorized',
            'errorMessage2': e
        };
        return response;
    }
}
}

exports.authenticator = authenticator;