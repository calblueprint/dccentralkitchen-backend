const express = require('express');
const bodyParser = require('body-parser');
const { Expo } = require('expo-server-sdk')
const Airtable = require('airtable');
const app = express();
app.use(bodyParser.json());
let expo = new Expo();
//var somePushTokens = []
var messages = []
var expoTokens = []
var base = new Airtable({apiKey: ''}).base('');

// old code used to get ids
/*//get push token ids from customer records in a global array of push tokens ids
base('Customers').select({
    view: "Customers",
}).eachPage(function page(records, fetchNextPage) {
    records.forEach(function(record) {
        console.log('Retrieved', record.get('Name'));
        let currId = record.get('Push Tokens')
        if (currId) {
            somePushTokens = somePushTokens.concat(record.get('Push Tokens'))
            console.log(somePushTokens)
        }
    });
    fetchNextPage();

}, function done(err) {
    if (err) { console.error(err); return; }
});*/

//iterate through the ids of tokens then get the corresponding expo token for the ids
/*for( let id of somePushTokens ){
    console.log(id)
    base('Push Tokens').find(id, function(err, record) {
        if (err) { console.error(err); return; }
        console.log('Retrieved', record.id);
        expoTokens.push(record.get('Token'))
    });
}*/

//returns promise that sets expo push tokens to the corresponding tokens
const convertExpoIds = function async() {
    return base('Customers')
            .select({
                view: "Customers",
            })
            .all()
            .then(records => {
                //gets all individual records of Customer table
                let PushTokenRecords = []
                for (let record of records){
                    //gets the Push token record ids associated with the customer
                    let currPushRecord = record.get('Push Tokens')
                    //if not null then concat the list to overall list of ids
                    if  (currPushRecord) {
                        PushTokenRecords = PushTokenRecords.concat(currPushRecord);
                    }
                }
                //returns ids
                return PushTokenRecords;
            }).then( ids => {
                //takes ids then maps them to an array of Promises of Push Token records that map to the ids
                let expoT = ids.map(id =>base('Push Tokens').find(id))
                //resolves promises
                return Promise.all(expoT);
            }).then(records => {
                //goes through each record and find ExpoToken and add to list
                for (let record of records) {
                    let currToken = record.get('Token')
                    expoTokens = expoTokens.concat(currToken)
                }
                return expoTokens;
            })
    };


convertExpoIds().then(console.log);
async function sendPush(title, info){

    //iterate through each token and send message
    for (let pushToken of expoTokens) {
        // Check that all your push tokens appear to be valid Expo push tokens
        if (!Expo.isExpoPushToken(pushToken)) {
            console.error(`Push token ${pushToken} is not a valid Expo push token`);
            continue;
        }
        // Construct a message (see https://docs.expo.io/versions/latest/guides/push-notifications.html)
        messages.push({
            to: pushToken,
            sound: 'default',
            title: title,
            body: info,
            data: { withSome: 'data' },
        })
        console.log(expoTokens)
    }

    //taken from expo example
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    (async () => {
        // Send the chunks to the Expo push notification service. There are
        // different strategies you could use. A simple one is to send one chunk at a
        // time, which nicely spreads the load out over time:
        for (let chunk of chunks) {
            try {
                let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log(ticketChunk);
                tickets.push(...ticketChunk);
                // NOTE: If a ticket contains an error code in ticket.details.error, you
                // must handle it appropriately. The error codes are listed in the Expo
                // documentation:
                // https://docs.expo.io/versions/latest/guides/push-notifications#response-format
            } catch (error) {
                console.error(error);
            }
        }
    })();
};

//@TODO kyle add auth.
app.post('/push', function(req, res) {
    console.log(req.body)
    var title = req.body.title;
    var info = req.body.info
    sendPush(title, info)
    res.send("Push Sent");
});



app.listen(3000, function() {
    console.log("Server is listening on port 3000...");
});