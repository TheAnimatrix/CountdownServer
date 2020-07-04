var admin = require("firebase-admin");
var serviceAccount = require("./countdown-app-23de7-firebase-adminsdk-83ro0-c1000b1f94.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://countdown-app-23de7.firebaseio.com",
    storageBucket:"gs://countdown-app-23de7.appspot.com"
});

var storage = admin.storage();



async function listFiles() {
    // Lists files in the bucket
    const [files] = await admin.storage().bucket().getFiles();

    console.log('Files:');
    files.forEach(file => {
      console.log(file.name);
    });
  }

function downloadFile(destFilename) {

    return new Promise((resolve,reject) => {
        const options = {
            // The path to which the file should be downloaded, e.g. "./file.txt"
            destination: destFilename,
          };
      
          // Downloads the file
          try{
              //this is synchronous
              console.log("downloading");
              admin.storage().bucket().file("fileToUpload.txt").createReadStream()
          .on('error', function(err) {
              console.log(err);
              reject(err);
          })
          .on('response', function(response) {
            // Server connected and responded with the specified status and headers.
            console.log("");
           })
          .on('end', function() {
            // The file is fully downloaded.
            console.log("end");
            resolve(true);
          })
          .pipe(require('fs').createWriteStream(`./newFile.txt`));
      
          }catch(e)
          {
              console.log(e);
              reject(e);
          }
    });

    
  }

  const UUID = require("uuid-v4");
  const fs = require('fs');

function uploadFile(filename) {

    return new Promise((resolve,reject)=>{
        let uuid = UUID();
        // Uploads a local file to the bucket
        var remoteFile = admin.storage().bucket().file(filename,);
        var localFile = fs.createReadStream(`./${filename}`)
    
        localFile.pipe(remoteFile.createWriteStream({
            // Support for HTTP requests made with `Accept-Encoding: gzip`
            gzip: true,
            // By setting the option `destination`, you can change the name of the
            // object you are uploading to a bucket.
            metadata: {
              // Enable long-lived HTTP caching headers
              // Use only if the contents of the file will never change
              // (If the contents will change, use cacheControl: 'no-cache')
              cacheControl: 'public, max-age=31536000',
              firebaseStorageDownloadTokens:uuid
            },
          }))
        .on('error', function(err) {
            console.log(JSON.stringify(err));
            reject();
        })
        .on('finish', function() {
          // The file upload is complete.
          console.log("finish uploading");
           resolve(true);
        });
    
        var url = "https://firebasestorage.googleapis.com/v0/b/" + admin.storage().bucket().name + "/o/" + filename + "?alt=media&token=" + uuid;
    
        console.log(`${filename} uploaded ${url}`);
    });

    

}




function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }   

async function run()
{
    //fileToUpload.txt is stored in the same directory as this code.
    await uploadFile('fileToUpload.txt');
    console.log("proceed");
    
    console.log("\n")
    await listFiles();

    console.log("\n")
    await downloadFile("newFile");
}

run();