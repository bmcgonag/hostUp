import { Meteor } from 'meteor/meteor';
import { URLToCheck } from '../imports/api/urlsToCheck.js';
import { HostStatus } from '../imports/api/hostStatus.js';
import { PingStatus } from '../imports/api/pingStatus.js';
import shelljs from 'shelljs';
import { log } from 'shelljs/src/common';
import { ConfigColl } from '../imports/api/configColl.js';

Meteor.methods({
  'hosts.call' (urlId, myURL, freq) {
    let now = new Date();
    let nowFormatted = moment(now).format('YYYY-MM-DD HH:mm:ss');

    let config = ConfigColl.findOne({});

    if (typeof config == 'undefined' || config == null || config == "") {
      var timeToRun = 30;
    } else {
      var timeToRun = config.defaultFreq;
    }

    // ****    set the next time for a check of the URL
    let nextCheck = moment(now).add(timeToRun, 'minutes').format('YYYY-MM-DD HH:mm:ss');

    callHostURL(myURL, urlId, nextCheck, timeToRun)

  },
});

// *******************************************************************************************
//
// Now we'll check the URLs to see if their next check time is here, and if so, check their
// status.
//
// *******************************************************************************************

callHostURL = function(myURL, urlId, nextCheck, timeToRun) {

  console.log("");
  console.log(" ----    Inside the functon to check the URLs    ----");
  console.log("");

  HTTP.get(myURL, { mode: 'no-cors' }, function(err, result) {
    if (err) {
      //
      // ****    first let's handle issues when the http request responds with an error
      // ****    we still need to write this to the log so we can pull it and display it to the user
      //

      console.log("Error:" + myURL + " " + err);

      // ****    if we get an error in the call, we can notify the end user by
      // ****    updating the collection and simply adding it as an error.

      Meteor.call('hostStatus.add', urlId, myURL, "Error - Down", "#FF0000", nextCheck, function(err, result) {
        if (err) {
          console.log("Error adding hostStatus to Collection: " + err);
        } else {
          //
          // ****    if it's successfully written - call our timer function to start the timer
          //
          repeatChecks(timeToRun);
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

      // console.dir(result);
      switch (result.statusCode) {
        case 200:
          status = "Up";
          color = "#32CD32";
          break;
        case 400:
          status = "Bad Request: 400";
          color = "#32CD32";
          break;
        case 401:
          status = "Authorization Required";
          color = "#32CD32";
          break;
        case 402:
          status = "Payment Required";
          color = "#32CD32";
          break;
        case 403:
          status = "Access Forbidden";
          color = "#32CD32";
          break;
        case 404:
          status = "Not Found";
          color = "#ff0000";
          break;
        case 405:
          status = "Method Not Allowed";
          color = "#32CD32";
          break;
        case 406:
          status = "Not Acceptable";
          color = "#FFA500";
          break;
        case 407:
          status = "Proxy Authentication Required";
          color = "#FFA500";
          break;
        case 408:
          status = "Request Timeout";
          color = "#FFA500";
          break;
        case 409:
          status = "Conflict";
          color = "#FFA500";
          break;
        case 410:
          status = "Gone";
          color = "#FFA500";
          break;
        case 414:
          status = "Request URL Too Large";
          color = "#FFA500";
          break;
        case 500:
          status = "Internal Server Error";
          color = "#FF0000";
          break;
        default:
          status = "Undefined Response";
          color = "#FF0000";
      }


      // **** first check to see if there is a current active hostSTatus in the mongodb.

      let currHostStatus = HostStatus.find({ urlId: urlId, active: true }).count();

      // console.log("------------- !!!!!!!!!!!!!!!! ----------------- !!!!!!!!!!!!!!! ----------------");
      console.log("Current Host Active Status Count for " + myURL + " is: " + currHostStatus);
      console.log("");

      // *******************************************************************************
      // if there is one, we set it to active = false, if not, wwe just add this
      // latest status check to the db as active = true.
      // *******************************************************************************
      if (currHostStatus != 0) {
        // console.log("");
        console.log("Found Host Count Active to NOT be zero!");
        console.log("");

        Meteor.call('hostStatus.updateActive', urlId, function(err, result) {
          if (err) {
            console.log("Error updating host status: " + err);
          } else {
            let reCheck = HostStatus.find({
              urlId: urlId,
              active: true
            }).count();

            // console.log("!!!!!! -------------- !!!!!! ------------- !!!!!! ---------------");
            // console.log("Re-count found Active hosts for url " + myURL + " are: " + reCheck);
            // console.log(" ");

            if (reCheck != 0) {

              // console.log("!!!!!! -------------- !!!!!! ------------- !!!!!! ---------------");
              // console.log("Re-count Shows - Stil NOT Zero!");
              // console.log("");

              Meteor.call('hostStatus.updateActive', urlId, function(err, result) {
                if (err) {
                  console.log("Error updating host status: " + err);
                } else {

                  // console.log("!!!!!! -------------- !!!!!! ------------- !!!!!! ---------------");
                  // console.log("--- After 3rd try - Finally Adding new Active Info for " + myURL);
                  // console.log("");

                  Meteor.call('hostStatus.add', urlId, myURL, status, color, nextCheck, function(err, result) {
                    if (err) {
                      console.log("Error adding host status: " + err);
                    } else {
                      console.log("--- *** --- Active Entry should have been made for " + myURL);
                      console.log(" ");
                    }
                  });
                }
              });
            } else {
              // console.log("!!!!!! -------------- !!!!!! ------------- !!!!!! ---------------");
              // console.log("Recheck was Zero! Adding new entry for " + myURL);
              // console.log("");

              Meteor.call('hostStatus.add', urlId, myURL, status, color, nextCheck, function(err, result) {
                if (err) {
                  console.log("Error adding host status: " + err);
                } else {
                  console.log("--- *** --- Active Entry should have been made for " + myURL);
                  console.log("");
                }
              });
            }

          }
        });
      } else {

        // console.log("!!!!!! -------------- !!!!!! ------------- !!!!!! ---------------");
        console.log("All Host Entries were Non-Active Already! Adding new site info.");
        console.log("");

        Meteor.call('hostStatus.add', urlId, myURL, status, color, nextCheck, function(err, result) {
          if (err) {
            console.log("Error adding Status Check for Host: " + err);
          } else {
            console.log("--- *** --- Active Entry should have been made for " + myURL);
            console.log("");
          }
        });
      }
    }
  });
}

// *******************************************************************************************
//
// Now we'll check the URLs to see if their next check time is here, and if so, check their
// status.
//
// *******************************************************************************************

checkURLsRepeat = function() {
  //
  // ****    this is code we run when the server starts. We have to do this so that the timer
  // ****    based checks start even if no one views the website for a while.
  //
  try {

    let status = "";

    //
    // ****    First let's pull back all of the URLs we need to check
    //
    let checkURLs = URLToCheck.find({}).fetch();

    //
    // ****    Now we'll make sure the collection we get back isn't empty, undefined, or null.
    // ****    As long as it's not, we'll start runnign through our array of info and assigning
    // ****    variables and setting up for our timer calls.
    //
    // ****    The section below looks complicated, but really I'm just setting up to compare
    // ****    the last checked time for a URL to the current date and time.  If the URL doesn't
    // ****    have a previous check, then we setup some defaults.
    //

    //
    // ****    get a count of how many URLs there are to check
    //
    let numUrlsToCheck = checkURLs.length;

    if (typeof checkURLs != 'undefined' && checkURLs != "" && checkURLs != null) {
      for (i = 0; i < numUrlsToCheck; i++) {
        let urlId = checkURLs[i]._id;
        let myURL = checkURLs[i].url;
        let freq = checkURLs[i].freqCheck; // this is the frequency to check in minutes.
        let now = new Date();
        let nowFormatted = moment(now).format('YYYY-MM-DD HH:mm:ss');
        let nowCompare = moment(nowFormatted).toISOString();

        let currStatus = HostStatus.findOne({ urlId: urlId }, { sort: { runOn: -1 } });

        if (typeof currStatus != 'undefined') {
          // **** we are checking to see if the current status isn't set (thus a new url
          // **** hasn't been checked yet). If not, then we get the next date / time a
          // **** a check should be run.
          let nextRunISO = moment(currStatus.nextRun).toISOString();

          if (nowCompare >= nextRunISO) {
            //
            // ****    basically if the current time is past when the next check should happen
            // ****    we will run the next check by calling the appropriate functions below
            //

            console.log("");
            console.log("Should run the check for " + myURL + " now.");
            console.log("");

            // **** check the URL and see if it's up.
            performURLCheck(now, nowFormatted, freq, myURL, urlId);

            // **** check the ping of the URL
            pingURL(now, nowFormatted, freq, myURL, urlId);

            // **** now set a timer to recheck things.
            if (i == numUrlsToCheck) {
              repeatChecks(freq);
            }

          } else {
            //
            // ****    if the next check isn't due yet, we just move on
            //

            // console.log("");
            // console.log("Skipping run for " + myURL + " for now. It's not Time.");
            // console.log("Next Run is after: " + currStatus.nextRun);
            // console.log("");
            let next = new Date(nextRunISO);
            let compare = new Date(nowCompare);
            let nextRunInMs = next - compare;
            let nextRunIn = nextRunInMs / 1000 / 60;

            console.log("**********************************************");
            console.log("Next Run will be at: " + nextRunIn + " min");
            console.log("**********************************************");
          }
        } else {
          //
          // ****    if the URL hasn't been run yet for some reason, we take this route.
          // ****    really we should never hit this, but it could happen if you empty your
          // ****    mongodb for some reason.
          //
          console.log("");
          console.log("Not run yet.");
          console.log("");

          // **** check the URL and see if it's up.
          performURLCheck(now, nowFormatted, freq, myURL, urlId);

          // **** check the ping of the URL
          pingURL(now, nowFormatted, freq, myURL, urlId);

          // **** now set a timer to recheck things.
          if (i == numUrlsToCheck) {
            repeatChecks(freq);
          }
        }
      }
    } else {
      //
      // **** you can uncomment this comment (or any for that matter) to get some logging
      // ****if you aren't getting what you expect.
      //

      // console.log("Didn't find any URLs to Check at this time.");
    }

  } catch (error) {
    console.log("Error Occurred server/hostCalls.js line 129: " + error);
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

repeatChecks = function(timeToRun) {
  if (timeToRun == "" || timeToRun == null || typeof timeToRun == 'undefined') {
    let defaultTime = 20;
    timeRun = defaultTime * 1000 * 60;
  } else {
    timeRun = timeToRun * 1000 * 60;
  }

  console.log("");
  console.log("-------------------------------------------");
  console.log("Setting Timer to re-run in " + (timeRun / 1000 / 60) + " minutes.");
  console.log("");
  Meteor.setTimeout(function() {
    checkURLsRepeat();
  }, timeRun);
}

//
// **** This is hour function to check the URL Host Status (but this one runs when the server starts
// **** vs. when we enter a new URL).  Again this could be broken out into more than one function, but
// **** I'll tackle that later.
//
performURLCheck = function(now, nowFormatted, freq, myURL, urlId) {

  let config = ConfigColl.findOne({});

  if (typeof config == 'undefinte' || config == null || config == "") {
    var timeToRun = 30;
  } else {
    var timeToRun = config.defaultFreq;
  }

  let nextCheck = moment(nowFormatted).add(timeToRun, 'minutes').format('YYYY-MM-DD HH:mm:ss');
  // console.log("Now is: " + nowFormatted);
  // console.log(("Next Check at: " + nextCheck));

  // console.log("----------------------------------------------");
  // console.log("URL ID = " + urlId);
  // console.log("!!!!!!!!  --------------------------  !!!!!!!!");

  let status = "";
  let color = "";

  //
  // **** if you feel like this is familiar, it is, we did this all up above
  // **** but in this case I also check to see if there is an existing hostStatus
  // **** that needs to be set to active = false, then add the new one and set it
  // **** to active = true.
  //

  console.log("");
  console.log(" ----     calling the function to check the URL    ----");
  callHostURL(myURL, urlId, nextCheck, timeToRun)


}

// **************************************************************************************************
// Now we want to run a ping check to give some stats on how our site's connection response is
// over time.  In the UI right now I display the last 1000 pings to give a feel for how rimes are
// over time
// **************************************************************************************************
pingURL = function(now, nowFormatted, timeToRun, url, urlId) {

  //
  // **** I have to do some fun stuff here.  We get the full URL then split off the
  // **** part before the fqdn, so https://google.com becomes google.com
  //
  let splitUrl = url.split('//');

  // console.log("splitURl is: " + splitUrl[1]);

  //
  // **** Here we use the shelljs npm package to run a linux / unix command line
  // **** command to ping the site 2 times.  You can increase this by changing the
  // **** number in the line below after the '-c'.
  //
  let pingExec = shelljs.exec("ping -c 2 " + splitUrl[1], {
    async: true
  }, function(stdout, code, err) {
    if (err) {
      console.log("Error on ShellJS call: " + err);
    } else {
      // console.log("Exit Code: " + code);
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
      // console.log("*****************************");
      // console.log("output from ping: ");
      // console.log("");

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
        Meteor.call('pingCheck.add', urlId, url, pingTime);
      }
    }
  }));
}
