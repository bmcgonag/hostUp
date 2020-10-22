import { Meteor } from 'meteor/meteor';
import { URLToCheck } from '../imports/api/urlsToCheck.js';
import { HostStatus } from '../imports/api/hostStatus.js';
import { PingStatus } from '../imports/api/pingStatus.js';
import shelljs from 'shelljs';
import { log } from 'shelljs/src/common';
import { ConfigColl } from '../imports/api/configColl.js';
import { Email } from 'meteor/email';
import { NmapData } from '../imports/api/nmapData.js';

Meteor.methods({
  'hosts.call' (urlId, myURL, freq, nmapScan) {

    // ****     first let's get the current date and time
    let now = new Date();

    // ****     next let's get the date time formatted so we can do some comparisons
    let nowFormatted = moment(now).format('YYYY-MM-DD HH:mm:ss');

    // ****     let's grab our configurations for the site from the mongo db.
    let config = ConfigColl.findOne({});

    // ****     check to see if the config collection exists and is defined
    if (typeof config == 'undefined' || config == null || config == "") {
      // ****     if it doesn't exist set the site default check time to every  20 minutes
      var timeToRun = 20;
    } else {
      // ****     if it does exist, get the time from the configuration collection
      var timeToRun = config.defaultFreq;
    }

    // ****    set the next time for a check of the URL
    let nextCheck = moment(now).add(timeToRun, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    if (nmapScan == true) {
      var nmapScanRecheck = moment(now).add(1, 'week').format('YYYY-MM-DD HH:mm:ss');
    }

    // ****    Now call the function to check our URLs status
    callHostURL(myURL, urlId, nextCheck, timeToRun, nmapScan, nmapScanRecheck)
  },
  'emailResults' (status, color, myURL, urlId) {
      let configCheck = ConfigColl.findOne({});
      let urlInfo = URLToCheck.findOne({ _id: urlId });

      if (typeof configCheck == 'undefined') {
          console.log("Configuration was undefined.");
      } else {
          if (configCheck.emailUser == "" || configCheck.emailUser == null || configCheck.emailPassword == "" || configCheck.emailPassword == null || configCheck.emailSmtpServer == "" || configCheck.emailSmtpServer == null || configCheck.emailSmtpPort == "" || configCheck.emailSmtpPort == null) {
            let toUser = urlInfo.emailAddress;  
            
            console.log("Email Info is not setup - not sending email.");
            
            // we first add an entry into our notify collection to provide visual feedback
            // to the useer on the web-page.
            Meteor.call("add.notification", myURL, toUser, status, function(err, result) {
              if (err) {
                console.log("Error adding Notification: " + err);
              }
            });
          } else {
              let toUser = urlInfo.emailAddress;
              let fromUser = configCheck.emailUser;
              let emailSubject = "Possible Site Down!";
              let emailBody = "Your Site, " + myURL + " returned with a status of " + status + " during a recent check.  Please check your sites status to ensure it is up and running.";

              // we first add an entry into our notify collection to provide visual feedback
              // to the useer on the web-page.
              Meteor.call("add.notification", myURL, toUser, status, function(err, result) {
                if (err) {
                  console.log("Error adding Notification: " + err);
                }
              });

              Email.send({
                  to: toUser,
                  from: fromUser,
                  subject: emailSubject,
                  html: emailBody
              });
          }
      }
  },
});

// *******************************************************************************************
//
// Now we'll check the URLs to see if their next check time is here, and if so, check their
// status.
//
// *******************************************************************************************

callHostURL = function(myURL, urlId, nextCheck, timeToRun, nmapScan, nmapScanRecheck) {

  HTTP.get(myURL, { mode: 'no-cors' }, function(err, result) {
    if (err) {
      //
      // ****    first let's handle issues when the http request responds with an error
      // ****    we still need to write this to the log so we can pull it and display it to the user
      //

      // console.log("Error:" + myURL + " " + err);

      // ****    if we get an error in the call, we can notify the end user by
      // ****    updating the collection and simply adding it as an error.

      Meteor.call('hostStatus.add', urlId, myURL, "Error - Down", "#FF0000", nextCheck, function(err, result) {
        if (err) {
          console.log("Error adding hostStatus to Collection: " + err);
        } else {
          //
          // ****    if it's successfully written - call our timer function to start the timer
          //
          status = "Internal Server Error";
          color = "#FF0000";
          email = "Yes";

          // ****    now we'll call our email function to send the user an email
          Meteor.call('emailResults', status, color, myURL, urlId);
          repeatChecks(timeToRun, false);
        }
      });
    } else {
      //
      // ****    if we don't have an error, then let's go through what we got back from our call
      // ****    to the site, and figure out which response we got.  We assign a status and color
      // ****    to display to our users.
      //

      // ****    TODO: at some point, I need to move this out into it's own function and call it,
      // ****    and sllow the end user to set their own colors for various header response
      // ****    codes

      switch (result.statusCode) {
        case 200:
          status = "Up";
          color = "#32CD32";
          email = "No";
          break;
        case 400:
          status = "Bad Request: 400";
          color = "#32CD32";
          email = "No";
          break;
        case 401:
          status = "Authorization Required";
          color = "#32CD32";
          email = "No";
          break;
        case 402:
          status = "Payment Required";
          color = "#32CD32";
          email = "No";
          break;
        case 403:
          status = "Access Forbidden";
          color = "#32CD32";
          email = "No";
          break;
        case 404:
          status = "Not Found";
          color = "#ff0000";
          email = "Yes";
          break;
        case 405:
          status = "Method Not Allowed";
          color = "#32CD32";
          email = "No";
          break;
        case 406:
          status = "Not Acceptable";
          color = "#FFA500";
          email = "Yes";
          break;
        case 407:
          status = "Proxy Authentication Required";
          color = "#FFA500";
          email = "Yes";
          break;
        case 408:
          status = "Request Timeout";
          color = "#FFA500";
          email = "Yes";
          break;
        case 409:
          status = "Conflict";
          color = "#FFA500";
          email = "Yes";
          break;
        case 410:
          status = "Gone";
          color = "#FFA500";
          email = "Yes";
          break;
        case 414:
          status = "Request URL Too Large";
          color = "#FFA500";
          email = "Yes";
          break;
        case 500:
          status = "Internal Server Error";
          color = "#FF0000";
          email = "Yes";
          break;
        default:
          status = "Undefined Response";
          color = "#FF0000";
          email = "Yes";
      }


      Meteor.call('hostStatus.add', urlId, myURL, status, color, nextCheck, function(err, result) {
        if (err) {
          console.log("Error adding host status: " + err);
        } else {
          // console.log("--- *** --- Active Entry should have been made for " + myURL);
          // console.log(" ");
          repeatChecks(timeToRun, false);
        }
      }); 

      // ****    if we found a down status or potentially down, we set 'email' as yes
      // ****    and send the email to the user to notify them of the status.
      if (email == "Yes") {
          Meteor.call('emailResults', status, color, myURL, urlId, function (err, result) {
              if (err) {
                  console.log("Error sending email: " + err);
              }
          });
      }
    }
  });
  return;
}

// *******************************************************************************************
//
// Now we'll check the URLs based on a timer
//
// *******************************************************************************************

checkURLsRepeat = function(serverStarted) {
  console.log("    ----    Inside checkURLsRepeat functioin - serverStarted = " + serverStarted);
  //
  // ****    this is code we run when the server starts. We have to do this so that the timer
  // ****    based checks start even if no one views the website for a while.
  //

  let config = ConfigColl.findOne({});
  // ****     check to see if the config collection exists and is defined
  if (typeof config == 'undefined' || config == null || config == "") {
    // ****     if it doesn't exist set the site default check time to every  20 minutes
    var timeToRun = 20;
  } else {
    // ****     if it does exist, get the time from the configuration collection
    var timeToRun = config.defaultFreq;
  }
  
  if (serverStarted == true) {
    try {
      runTheChecks(timeToRun);
    } catch (error) {
      console.log("Error Ocurred server/hostCalls.js line 259 through 263: " + error);
    }
  } else {
    try {
      runTheChecks(timeToRun);   
    } catch (error) {
      console.log("Error Occurred server/hostCalls.js line 266 through 269: " + error);
    }
  }
}

// **********************************************
//              Run the Checks
// **********************************************
runTheChecks = function(timeToRun) {
  console.log("    ----    Inside runTheChecks function - timeToRun = " + timeToRun);
  let status = "";
  let checkURLs = URLToCheck.find({}).fetch();

  if (typeof checkURLs != 'undefined' && checkURLs != "" && checkURLs != null) {

    let numUrlsToCheck = checkURLs.length;

    for (let i = 0; i < numUrlsToCheck; i++) {
      let urlId = checkURLs[i]._id;
      let myURL = checkURLs[i].url;
      let now = new Date();
      let nowFormatted = moment(now).format('YYYY-MM-DD HH:mm:ss');
      let nowCompare = moment(nowFormatted).toISOString();

      // console.log("****    ------------------------------------------      ****");
      console.log("    ****    Checking URL: " + myURL);

      let currStatus = HostStatus.findOne({ urlId: urlId }, { sort: { runOn: -1 } });

      // **** check the URL and see if it's up.
      performURLCheck(now, nowFormatted, timeToRun, myURL, urlId);

      // **** check the ping of the URL
      pingURL(now, nowFormatted, timeToRun, myURL, urlId);

      // **** now set a timer to recheck things.
      if (i < (numUrlsToCheck-1)) {
        // console.log("****    Line 303:    Called it for the " + i + " time.");
        if (i == 0) {
          timerSet = false;
        } else {
          timerSet = true;
        }
        repeatChecks(timeToRun, timerSet);
      }
    }
  } else {
    //
    // **** you can uncomment this comment (or any for that matter) to get some logging
    // ****if you aren't getting what you expect.
    //
    console.log("Didn't find any URLs to Check at this time.");
  }
}

// *******************************************************************************************
//
// this is our timer function. We pass it the time in minutes to wait for the next run
// of any url.  It's not super accurate...so each time it goes off, we acutally check
// every url's nextRunTime against the current time, and decide if the url needs to be run.
//
// it works..so until I think of a better way, I'll keep it.
//
// *******************************************************************************************

repeatChecks = function(timeToRun, timerSet) {
  console.log("    ---- Inside repeatChecks functio - timeToRun, timerSet = " + timeToRun + ", " + timerSet);
  if (timeToRun == "" || timeToRun == null || typeof timeToRun == 'undefined') {
    let defaultTime = 20;
    timeRun = defaultTime * 1000 * 60;
  } else {
    timeRun = timeToRun * 1000 * 60;
  }

  if (timerSet == false) {
    timerSet = true;

    console.log("");
    console.log("    ----    About to set timeout.");
    console.log("");
    Meteor.setTimeout(function() {
      checkURLsRepeat(true);
    }, timeRun);
  } else {
    console.log("timer already showed to be set.");
    timerSet = true;
  }
}

// *******************************************************************************************
//
// **** This is our function to check the URL Host Status (but this one runs when the server starts
// **** vs. when we enter a new URL).  Again this could be broken out into more than one function, but
// **** I'll tackle that later.
//
// *******************************************************************************************

performURLCheck = function(now, nowFormatted, freq, myURL, urlId) {
  console.log("    ----    Inside peerformURLChecks function.");
  let config = ConfigColl.findOne({});

  if (typeof config == 'undefined' || config == null || config == "") {
    var timeToRun = 20;
  } else {
    var timeToRun = config.defaultFreq;
  }

  let nextCheck = moment(nowFormatted).add(timeToRun, 'minutes').format('YYYY-MM-DD HH:mm:ss');
  console.log(("Next Check at: " + nextCheck));

  let status = "";
  let color = "";

  callHostURL(myURL, urlId, nextCheck, timeToRun);
}

// **************************************************************************************************
//
// Now we want to run a ping check to give some stats on how our site's connection response is
// over time.  In the UI right now I display the last 1000 pings to give a feel for how rimes are
// over time
//
// **************************************************************************************************

pingURL = function(now, nowFormatted, timeToRun, url, urlId) {
  console.log("    ----    Inside pingURL function.");
  //
  // **** I have to do some fun stuff here.  We get the full URL then split off the
  // **** part before the fqdn, so https://google.com becomes google.com
  //
  let splitUrl = url.split('//');

  //
  // **** Here we use the shelljs npm package to run a linux / unix command line
  // **** command to ping the site 2 times.  You can increase this by changing the
  // **** number in the line below after the '-c'.
  //
  let pingExec = shelljs.exec("ping -c 2 " + splitUrl[1], { async: true }, function(stdout, code, err) {
    if (err) {
      console.log("Error on ShellJS call for ping: " + err);
    } else {
      // console.log("Exit Code for ping: " + code);
    }
  });

  //
  // **** the following lines take the output from the command above and let us
  // **** split it out to get the ping time out of the info in the standard out
  // **** or better known (stdout).
  //
  pingExec.stdout.on('data', Meteor.bindEnvironment(function(data) {
    //
    // **** now we'll split the output (stdout) of the command
    //
    let dataSplit = data.split('time=');

    //
    // **** we check to make sure the dataSplit variable has data we need
    //
    if (typeof dataSplit == 'undefined' || dataSplit == null || dataSplit == "") {
      // console.log("This part didn't have ping time data.");
    } else {
      //
      // **** Probably looks confusing, but I'm slowly splitting down the stdout info
      // **** into the parts we need to get the ping time data.
      //
      if (typeof dataSplit[1] == "undefined") {
        // console.log("dataSplit was undefined.");
      } else {
        // console.log(dataSplit[1]);
        let pingTimeSent = dataSplit[1];

        let partialPingTime = pingTimeSent.split('\n\n');

        let pingTime = partialPingTime[0];

        //
        // **** Finaly, we can now write this info to the database for ping data
        //
        Meteor.call('pingCheck.add', urlId, url, pingTime, function(err, result) {
          if (err) {
            console.log("Error adding ping check: " + err);
          } else {
            // console.log("Ping Check added to db.");
          }
        });
      }
    }
  }));
}
