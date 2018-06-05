import { URLToCheck } from '../../imports/api/urlsToCheck.js';

Template.hostInput.onCreated(function() {
    this.subscribe("urlChecks");
});

Template.hostInput.onRendered(function() {
    
});

Template.hostInput.helpers({
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
    }
});

Template.hostInput.events({
    'click #submitURL' (event) {
        event.preventDefault();

        let url = $("#urlToCheck").val();
        let often = $("#checkFrequency").val();
        let emailIsDown = $('#emailIfDown').prop('checked')
        let emailAddress = $("#emailAddress").val();

        // console.log(("Email If down if: " + emailIfDown));
        
        if (url == "" || url == null) {
            showSnackbar("URL is Required!", "red");
            return;
        } else if (emailIsDown == true) {
            if (emailAddress == "" || emailAddress == null) {
                showSnackbar("Email Address is Required!"), "red";
                return;
            }
        }
        
        if (often == "" || often == null) {
            often = 20;
        } else {
            often = parseInt(often);
        }

        Meteor.call("host.add", url, often, emailIsDown, emailAddress, function(err, result) {
            if (err) {
                console.log("Error adding host url: " + err);
                showSnackbar("Error Adding Host!", "red");
            } else {
                showSnackbar("Host Added Successfully!", "green");
                Meteor.call("hosts.call", result, url, often);
            }
        });
    },
    'click #saveChangedURL' (event) {
        event.preventDefault();

        // set the values the user has entered to pass to the update method.

        let urlId = Session.get("urlId");
        let url = $("#urlToCheck").val();
        let often = $("#checkFrequency").val();
        let emailIsDown = $('#emailIfDown').prop('checked')
        let emailAddress = $("#emailAddress").val();

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

        // set the mode to new so the user can enter new hosts if needed.
        Session.set("inputMode", "new");

        // call the update method and pass the variables from above.
        Meteor.call("host.edit", urlId, url, often, emailIsDown, emailAddress, function(err, result) {
            if (err) {
                console.log("Error adding host url: " + err);
                showSnackbar("Error Adding Host!", "red");
            } else {
                showSnackbar("Host Added Successfully!", "green");
                Meteor.call("hosts.call", urlId, url, often);
            }
        });

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
            $("#emailAddress").val("");
        }
    }
});