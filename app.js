const express = require('express');
const bodyParser = require('body-parser');
const { Expo } = require('expo-server-sdk')
const Airtable = require('airtable');
const app = express();
app.use(bodyParser.json());
let expo = new Expo();
var somePushTokens = []
var messages = []
var base = new Airtable({apiKey: 'keyCguJZNuPquR5Ns'}).base('app4fXK49bqcjDMEo');

base('Customers').select({
    view: "Customers",
}).eachPage(function page(records, fetchNextPage) {
    records.forEach(function(record) {
        console.log('Retrieved', record.get('Name'));
        somePushTokens.push(record.get('Push Token'))
    });
    fetchNextPage();

}, function done(err) {
    if (err) { console.error(err); return; }
});

async function sendPush(title, info){
    console.log(title);
    for (let pushToken of somePushTokens) {
        // Each push token looks like ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]

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
    }

// The Expo push notification service accepts batches of notifications so
// that you don't need to send 1000 requests to send 1000 notifications. We
// recommend you batch your notifications to reduce the number of requests
// and to compress them (notifications with similar content will get
// compressed).
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