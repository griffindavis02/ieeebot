require('dotenv').config()
const puppeteer = require('puppeteer')
const delay = require('delay')
const InstaBot = require('./InstaBot')
const fetch = require('node-fetch')

const options = {
    username: process.env.IG_USERNAME,
    password: process.env.IG_PASSWORD,

    dailyFollowLimit: 150,
    hourlyFollowLimit: 20,

    usersToFollowFollowersOf: ['novaengineer'],

    skipPrivate: true,
    dryRun: true
};

async function startBot() {
    try {
        let browser = await puppeteer.launch({ headless: false });

        const bot = await InstaBot.InstBot(options, browser);

        await bot.FollowBot();
    } catch (e) {
        console.log(e);
    }
    // finally {
    //     console.log('Closing browser');
    //     if (browser) await browser.close();
    // }

    // const userJSON = JSON.parse(await fetch('https://www.instagram.com/novaengineer/?__a=1')
    //     .then(res => res.text())
    //     .catch(err => console.log(err)));

    // console.log(userJSON.graphql.user.edge_followed_by.count);
    // use this method to see if follower is mutual or read button
    // userJSON.graphql.user.followed_by_viewer
    // userJSON.graphql.user.requested_by_viewer
    // userJSON.graphql.user.follows_viewer
}

startBot();