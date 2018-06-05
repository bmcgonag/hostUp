import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

export const HostStatus = new Mongo.Collection('hostStatus');

HostStatus.allow({
    insert: function(userId, doc){
        // if use id exists, allow insert
        return !!userId;
    },
});

Meteor.methods({
    'hostStatus.add' (urlId, url, status, statusColor, nextRun) {
        check(urlId, String);
        check(url, String);
        check(status, String);
        check(statusColor, String);
        check(nextRun, String);

        return HostStatus.insert({
            urlId: urlId,
            url: url,
            status: status,
            statusColor: statusColor,
            nextRun: nextRun,
            runOn: new Date,
        });
    }
});