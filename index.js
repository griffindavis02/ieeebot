require('dotenv').config()
const puppeteer = require('puppeteer')
const InstaBot = require('./InstaBot')
const fs = require('fs')
const spawn = require('child_process').spawn

const options = {
    username: process.env.IG_USERNAME,
    password: process.env.IG_PASSWORD,

    dailyFollowLimit: 150,

    usersToFollowFollowersOf: ['villanovaengineering'],

    skipPrivate: false,
    dryRun: false
}

async function startBot() {
    // ARM Implementation
    let browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    // let browser = await puppeteer.launch({ headless: false })
    
    try {
        const bot = await InstaBot.InstBot(options, browser)

        await bot.FollowBot()
        const pythonProcess = spawn('python', ['./sendEmail.py'])
        await browser.close()
    } catch (e) {
        console.log('Error caught:')
        console.log(e)
        const [page] = await browser.pages()

        const html = await page.evaluate(() => document.querySelector('*').outerHTML)
        fs.writeFileSync('lastHTML.html', html)

        await page.screenshot({
            path: './errorSnap.png',
            fullPage: true
        })
        await browser.close()
    }
    finally {
        console.log('Closing browser')
        if (browser) await browser.close()
    }
}

startBot()