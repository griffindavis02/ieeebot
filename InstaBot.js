const puppeteer = require('puppeteer')
const delay = require('delay')
const fs = require('fs')

const igBaseUrl = 'https://www.instagram.com/'

/**
 * @param {puppeteer.browser} browser puppeteer browser
 * <p><pre>
 * @param {JSON} options JSON with the following options
 * username: instagram username
 * password: instagram password
 * dailyFollowLimit: how many followers you want to follow each day, 150 by default
 * usersToFollowFollowersOf: array of users to follow followers of
 * skipPrivate: true or false
 * dryRun: true by default, won't actually follow users if true</p></pre>
 */
const InstBot = async(options, browser) => {
    const {
        username,
        password,
        dailyFollowLimit = 150,
        usersToFollowFollowersOf,
        skipPrivate = false,
        dryRun = true,
    } = options

    const [page] = await browser.pages()

    async function FollowBot() {

        if (options.dailyFollowLimit > 200) {
            options.dailyFollowLimit = 200
            console.log('Daily follow limit greater than IG allowed 200, setting to 200')
        }

        try {
            // const page = await browser.newPage()
            await page.goto(igBaseUrl)

            console.log('Logging in...')
            await page.waitForSelector('input._2hvTZ.pexuQ.zyHYP')
            await page.type('#loginForm > div > div:nth-child(1) > div > label > input', options.username, { delay: 100 })
            await page.type('#loginForm > div > div:nth-child(2) > div > label > input', options.password, { delay: 100 })
            await page.click('#loginForm > div > div:nth-child(3) > button')

            await page.waitForSelector('#react-root > section > main > div > div > div > section > div > button', {
                visible: true,
                timeout: 10000,
            }).then((async() => {
                console.log('First sign-in, saving info...')
                await page.click('#react-root > section > main > div > div > div > section > div > button')
            }))

            await page.waitForSelector('body > div.RnEpo.Yx5HN > div > div > div > div.mt3GC > button.aOOlW.HoLwm', {
                visible: true,
                timeout: 10000,
            }).catch(e => console.error("No notification alert. Likely detected strange activity"))
            .then((async() => {
                console.log('Notification alert. Choosing not to turn on...')
                await page.click('body > div.RnEpo.Yx5HN > div > div > div > div.mt3GC > button.aOOlW.HoLwm')
            }))
            let accounts = []

            for (account of options.usersToFollowFollowersOf) {
                console.log('Scanning ' + account)
                let temp = await getFollowers(account)
                accounts = accounts.concat(temp)
            }

            if (options.skipPrivate) await filterPrivate(accounts)

            await followAccounts(accounts)

        } catch (e) {
            console.log(e)
        }
    }

    /**
     * 
     * @param {String} user Account to get followers of
     * @param {puppeteer.browser.page} page Page for navigating to JSON files
     */
    async function getFollowers(user) {
        const followerList = []
        try {
            await page.goto(`${igBaseUrl}${user}/?__a=1`)
            await page.content()
            const userJSON = await getPageJSON()

            const uid = userJSON.graphql.user.id
            const followersUrl = `${igBaseUrl}graphql/query/?query_hash=37479f2b8209594dde7facb0d904896a`
            const graphqlVariables = {
                id: uid,
                first: 50,
            }
            let hasNextPage = true

            while (hasNextPage) {
                await page.goto(`${followersUrl}&variables=${JSON.stringify(graphqlVariables)}`)
                await page.content()
                json = await getPageJSON()

                const pageInfo = json.data.user.edge_followed_by.page_info
                const { edges } = json.data.user.edge_followed_by

                // push all followers not followed or requested
                for (edge of edges) {
                    const currentUser = edge.node.username
                    if (false == (edge.node.followed_by_viewer || edge.node.requested_by_viewer)) {
                        followerList.push(currentUser)
                    }
                }

                graphqlVariables.after = pageInfo.end_cursor
                hasNextPage = pageInfo.has_next_page
            }
            console.log(followerList)
        } catch (e) {
            console.log(e)
        } finally {
            return followerList
        }
    }

    /**
     * If skipPrivate is true, run this to filter private accounts
     * from the followerList
     * @param {String Array} followerList 
     */
    async function filterPrivate(followerList) {
        console.log('Filtering out private accounts')
        for (currentUser of followerList) {
            await page.goto(`${igBaseUrl}${currentUser}/?__a=1`)
            await page.content()
            json = await getPageJSON()
            if (json.graphql.user.is_private) {
                followerList.splice(followerList.indexOf(currentUser), 1)
            }
        }
    }

    /**
     * Iterates throught a list of instagram accounts and follows them
     * @param {String Array} accounts => Navigate to each account and follow them
     * @param {puppeteer.browser.page} page => Page for navigating to accounts
     */
    async function followAccounts(accounts) {
        console.log('Following accounts \n')
        let sleepTime = Math.ceil((24 * 60 * 60 * 1000) / options.dailyFollowLimit)

        for(account of accounts) {
            console.log('Navigating to user ' + account)
            await page.goto(`${igBaseUrl}${account}`)
            const followButton = '#react-root > section > main > div > header > section > div.nZSzR > div.Igw0E.IwRSH.eGOV_.ybXk5._4EzTm > div > div > button'
            await page.waitForSelector(followButton)
            console.log(`Following ${account}`)
            if (!options.dryRun) {
                await page.click(followButton)
                await page.waitForTimeout(1000)
                const [unfollowButton] = await page.$('#react-root > section > main > div > header > section > div.nZSzR > div.Igw0E.IwRSH.eGOV_.ybXk5._4EzTm > div > div:nth-child(2) > div > span > span.vBF20._1OSdk > button')
                if (unfollowButton != null) {
                    console.log('User followed')
                }
            }

            console.log('Sleeping for ' + Math.ceil(sleepTime / 1000) + ' seconds')
            await delay(sleepTime)
        }
       
        console.log('Done following accounts. Creating/updating accounts.json file.')
        fs.writeFileSync('accounts.json', JSON.stringify(accounts))

        console.log('Closing browser')
        await browser.close()
    }

    /**
     * Gets JSON of active webpage
     */
    async function getPageJSON() {
        let json
        try {
            json = await page.evaluate(() => {
                return JSON.parse(document.querySelector("body").innerText)
            })
            return json
        } catch (e) {
            console.log("JSON not found for page: " + page.url())
            console.error
        }
    }

    return {
        FollowBot,
    }
}

module.exports = { InstBot }