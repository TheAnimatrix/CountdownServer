var firebase = require('firebase/app');
var auth = require('firebase/auth');

var app = firebase.initializeApp({
    apiKey: "AIzaSyAEYYcRJwtypQ2lTf9HBHufdkhJyGkQYq8",
    authDomain: "countdown-app-23de7.firebaseapp.com",
    databaseURL: "https://countdown-app-23de7.firebaseio.com",
    projectId: "countdown-app-23de7",
    storageBucket: "countdown-app-23de7.appspot.com",
    messagingSenderId: "80381574599",
    appId: "1:80381574599:web:711f7be8d99508d8506de2",
    measurementId: "G-84VH5VBDXT"
});

const express = require('express');
const exp = express();
const port = 3002;
exp.get('/',async (req,res)=>{
    let credential = await app.auth().signInWithEmailAndPassword('zappo.fury@gmail.com','angara61');
    let token = await credential.user.getIdToken();
    res.status(200).send({result:token});
});

exp.listen(port,()=>console.log(`App listening at http://localhost:${port}`));


async function run()
{
    let credential = await app.auth().signInWithEmailAndPassword('zappo.fury@gmail.com','angara61');
    console.log(JSON.stringify(await credential.user.getIdToken()));
}

run();