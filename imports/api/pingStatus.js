import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

export const PingStatus = new Mongo.Collection('pingStatus');

PingStatus.allow({
    insert: function(userId, doc){
        // if use id exists, allow insert
        return !!userId;
    },
});

Meteor.methods({
    'pingCheck.add' (url, pingResponse, pingTime, color) {
        check(url, String);
        check(pingResponse, String);
        check(pingTime, Number);
        check(color, String);

        return PingStatus.insert({
            url: url,
            pingResponse: pingResponse,
            pingTime: pingTime,
            color: color
        });
    },
});