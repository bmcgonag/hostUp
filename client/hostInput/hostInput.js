import { URLToCheck } from '../../imports/api/urlsToCheck.js';
import { ConfigColl } from '../../imports/api/configColl.js';

Template.hostInput.onCreated(function() {
    this.subscribe("urlChecks");
    this.subscribe("configSettings");
});

Template.hostInput.onRendered(function() {

});

Template.hostInputForm.helpers({
    urlId: function() {
        return Session.get("urlId");
    },
    editUrl: function() {
        return Session.get("editUrl");
    },
    freq: function() {
        return Session.get("freq");
    },
    emailIfDown: function() {
        return Session.get("emailIfDown");
    },
    emailAddress: function() {
        return Session.get("emailAddress");
    },
    inputMode: function() {
        return Session.get("inputMode");
    },
});

Template.hostInput.helpers({
    canAddSite: function() {
        let config = ConfigColl.findOne({});
        if (config) {
            let maxSitesUnPaid = config.maxNoOfSitesFree;

            let myNoSites = URLToCheck.find().count();
    
            if (myNoSites >= maxSitesUnPaid) {
                return false;
            } else {
                return true;
            }
        } else {
            return true;
        }
    },
});

Template.hostInputForm.events({
    'click #submitURL' (event) {
        event.preventDefault();

        console.log("Clicked!");

        let url = $("#urlToCheck").val();
        let emailIsDown = $('#emailIfDown').prop('checked')
        let emailAddress = $("#emailAddress").val();
        let nmapScan = $("#nmapScan").prop('checked');
        let often = 20;

        console.log("emailIsDown: " + emailIsDown);

        if (url == "" || url == null) {
            showSnackbar("URL is Required!", "red");
            return;
        } else if (emailIsDown == true) {
            if (emailAddress == "" || emailAddress == null) {
                showSnackbar("Email Address is Required!"), "red";
                return;
            }
        }

        let urlValid;
        // console.log(url.slice(0,8));
        // console.log(url.slice(0,7));
        if (url.slice(0,8) == "https://") {
            urlValid = true;
    } else if (url.slice(0,7) == "http://") {
            urlValid = true;
        } else {
            urlValid = false;
        }

        if (urlValid == true) {
            if (emailIsDown != true && emailIsDown != false) {
                console.log("weird value you for emailisDown: " + emailIsDown);
            } else {
                Meteor.call("host.add", url, often, emailIsDown, emailAddress, nmapScan, function(err, result) {
                    if (err) {
                        console.log("Error adding host url: " + err);
                        showSnackbar("Error Adding Host!", "red");
                    } else {
                        showSnackbar("Host Added Successfully!", "green");
                     Meteor.call("hosts.call", result, url, often);
                    }
                });
            }
            
        } else {
            showSnackbar("URL is Invalid - Please enter a URL with http:// or https://", "red");
            return;
        }
    },
    'click #saveChangedURL' (event) {
        event.preventDefault();

        // set the values the user has entered to pass to the update method.

        let urlId = Session.get("urlId");
        let url = $("#urlToCheck").val();
        let often = $("#checkFrequency").val();
        let emailIsDown = $('#emailIfDown').prop('checked')
        let emailAddress = $("#emailAddress").val();
        let nmapScan = $("#nmapScan").prop('checked');

        // console.log(("Email If down if: " + emailIfDown));

        // check that they've entered the minimum required info.

        if (url == "" || url == null) {
            showSnackbar("URL is Required!", "red");
            return;
        } else if (emailIsDown == true) {
            if (emailAddress == "" || emailAddress == null) {
                showSnackbar("Email Address is Required!"), "red";
                return;
            }
        }

        // set a default timeframe to check (default time = 20 minutes)

        if (often == "" || often == null) {
            often = 20;
        } else {
            often = parseInt(often);
        }

        let urlValid;
        // console.log(url.slice(0,8));
        // console.log(url.slice(0,7));
        if (url.slice(0,8) == "https://") {
            urlValid = true;
        } else if (url.slice(0,7) == "http://") {
            urlValid = true;
        } else {
            urlValid = false;
        }

        if (urlValid == true) {
            // set the mode to new so the user can enter new hosts if needed.
            Session.set("inputMode", "new");

            // call the update method and pass the variables from above.
            Meteor.call("host.edit", urlId, url, often, emailIsDown, emailAddress, nmapScan, function(err, result) {
                if (err) {
                    console.log("Error adding host url: " + err);
                    showSnackbar("Error Adding Host!", "red");
                } else {
                    showSnackbar("Host Added Successfully!", "green");
                    Meteor.call("hosts.call", urlId, url, often, nmapScan);
                }
            });
        } else {
            showSnackbar("URL is Invalid - Please enter a URL with http:// or https://", "red");
            return;
        }
    },
    'click #cancelHostInput' (event) {
        event.preventDefault();

        let mode = Session.get("inputMode");

        if (mode == "edit") {
            Session.set("inputMode", "new");
            FlowRouter.go('/hostList');
        } else {
            $("#urlToCheck").val("");
            $("#checkFrequency").val("");
            $('#emailIfDown').prop('checked', false);
            $("#nmapScan").prop('checked', false);
            $("#emailAddress").val("");
        }
    },
    'click #subscribeButton' (event) {
        event.preventDefault();

        console.log("Subscribe Clicked.");
    },
});
