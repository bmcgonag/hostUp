import { Meteor } from 'meteor/meteor';

import { URLToCheck } from '../imports/api/urlsToCheck.js';
import { HostStatus } from '../imports/api/hostStatus.js';
import shelljs from 'shelljs';
import { log } from 'shelljs/src/common';

Meteor.startup(() => {
  checkURLsRepeat();
  // Meteor.setTimeout(function() {
  //   checkURLsRepeat();
  // }, 60000);
});

checkURLsRepeat = function() {
  try {
    console.log("-------- --------- --------");
    console.log("Setting up the next Check.");
    let status = "";
    // code to run on server at startup
    let checkURLs = URLToCheck.find({}).fetch();

    if (typeof checkURLs != 'undefined' && checkURLs != "" && checkURLs != null) {
      for (i=0; i < checkURLs.length; i++) {
          let myURL = checkURLs[i].url;
          let freq = checkURLs[i].freqCheck;
          let now = new Date();
          let nowFormatted = moment(now).format('YYYY-MM-DD hh:mm:ss');
          let nextCheck = moment(nowFormatted).add(freq, 'minutes').format('YYYY-MM-DD hh:mm:ss');
          // console.log("Now is: " + nowFormatted);
          // console.log(("Next Check at: " + nextCheck));
          HTTP.get(myURL, {mode: 'no-cors'}, function(err, result){
            if (err) {
                console.log("Error:" + myURL + " " + err);
            } else {
                // console.dir(result);
                if (result.statusCode == 200) {
                    let status = "Up";
                    console.log("Success!");
                    Meteor.call('hostStatus.add', myURL, status, "#32CD32");
                } else if (result.statusCode == 400) {
                  let status = "Bad Request";
                  console.log("Success! Bad Request Returned.");
                  Meteor.call('hostStatus.add', myURL, status, "#32CD32");
                } else if (result.statusCode == 401) {
                  let status = "Authorization Required";
                  console.log("Success! Authorization Required.");
                  Meteor.call('hostStatus.add', myURL, status, "#ff0000");
                } else if (result.statusCode == 402) {
                  let status = "Payment Required";
                  console.log("Success! Payment Required.");
                  Meteor.call('hostStatus.add', myURL, status, "#ff0000");
                } else if (result.statusCode == 403) {
                  let status = "Access Forbidden";
                  console.log("Success! Access Forbidden.");
                  Meteor.call('hostStatus.add', myURL, status, "#32CD32");
                } else if (result.statusCode == 404) {
                  let status = "Not Found!";
                  console.log("Not Found! Site may be down!");
                  Meteor.call('hostStatus.add', myURL, status, "#ff0000");
                  // this should trigger an alert.
                } else if (result.statusCode == 405) {
                  let status = "Method Not Allowed";
                  console.log("Success! Method Not Allowed");
                  Meteor.call('hostStatus.add', myURL, status, "#32CD32");
                } else if (result.statusCode == 406) {
                  let status = "Not Acceptable";
                  console.log("Host May Be Down! Not Acceptable.");
                  Meteor.call('hostStatus.add', myURL, status, "#FFA500");
                } else if (result.statusCode == 407) {
                  let status = "Proxy Authentication Required";
                  console.log("Success! Proxy Authentication Required.");
                  Meteor.call('hostStatus.add', myURL, status, "#FFA500");
                } else if (result.statusCode == 408) {
                  let status = "Request Timeout";
                  console.log("Host May Be Down! Request Timeout");
                  Meteor.call('hostStatus.add', myURL, status, "#FFA500");
                } else if (result.statusCode == 409) {
                  let status = "Conflict";
                  console.log("Host May Be Down! Conflict");
                  Meteor.call('hostStatus.add', myURL, status, "#FFA500");
                } else if (result.statusCode == 410) {
                  let status = "Gone";
                  console.log("Host May Be Down! Gone");
                  Meteor.call('hostStatus.add', myURL, status, "#FFA500");
                } else if (result.statusCode == 414) {
                  let status = "Request URL Too Large";
                  console.log("Error! Request URL Too Large.");
                  Meteor.call('hostStatus.add', myURL, status, "#FF0000");
                } else if (result.statusCode == 500) {
                  let status = "Internal Server Error";
                  console.log("Site Inoperative. Internal Server Error.");
                  Meteor.call('hostStatus.add', myURL, status, "#FF0000");
                }
            }
          });
      }
      repeatChecks();
    } else {
      console.log("Didn't find any URLs to Check at this time.");
    }
    
  } catch (error) {
    console.log("Error Occurred: " + error);
  }
  
}

repeatChecks = function() {
  Meteor.setTimeout(function() {
    checkURLsRepeat();
  }, 15000);
}
