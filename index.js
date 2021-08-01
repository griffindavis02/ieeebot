require('dotenv').config()
const puppeteer = require('puppeteer')
const InstaBot = require('./InstaBot')
// const fetch = require('node-fetch')
const spawn = require('child_process').spawn

const options = {
    username: process.env.IG_USERNAME,
    password: process.env.IG_PASSWORD,

    dailyFollowLimit: 150,

    usersToFollowFollowersOf: ['villanovaengineering'],

    skipPrivate: false,
    dryRun: true
}

async function startBot() {
    try {
        let browser = await puppeteer.launch({ headless: false })

        const bot = await InstaBot.InstBot(options, browser)

        await bot.FollowBot()
        const pythonProcess = spawn('python', ['./sendEmail.py'])
        await browser.close()
    } catch (e) {
        console.log(e)
        await browser.close()
    }
    finally {
        console.log('Closing browser')
        if (browser) await browser.close()
    }
}

startBot()