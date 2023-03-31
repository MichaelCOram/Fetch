// Michael Oram //
// Fetch Web Scraping Coding Exercise //

const puppeteer = require('puppeteer');

// function used to log into an account
async function login(page) { 
    const email = 'ex@example.com';
    const password = 'password123';
    const emailSelector = '#email'; 
    const passwordSelector = '#password'; 
    const signInButtonSelector = '[data-testid="button"]'; 
    
    let loginSuccessful = false;
    while (!loginSuccessful) {
        await page.waitForSelector(emailSelector); // wait for text boxes to load
        await page.waitForSelector(passwordSelector);
        await page.type(emailSelector, email); // enter email address and password
        await page.type(passwordSelector, password); 
        await page.click(signInButtonSelector); // click sign in
        await page.waitForTimeout(1000); 
        if (page.url().includes('/signin')) { // check if URL changed
            await Promise.all([
                page.waitForSelector(emailSelector),
                page.type(emailSelector, ''),
                page.type(passwordSelector, ''),
            ]);
        } else {
            loginSuccessful = true;
        }
    }
}

// function used to calculate total cost of items and returns the total
async function addItemPrices(items) { 
    let total = 0;
    for (const item of items) {
        const priceElement = await item.$('[id^="order-item-price-"] p:last-child');
        const priceText = await priceElement.evaluate(node => node.textContent.trim().replace('$', ''));
        const price = parseFloat(priceText);
        total += price;
    }
    return total.toFixed(2); // total with two decimals
}

// function scrapes orders from page, specifically orderIds and items, then updates Map 
async function pullOrders(page, orderMap) {
    await page.waitForSelector('[data-order-id]'); 
    const statusSelector = 'div.mr-10.svelte-1sd6u5w:nth-child(2) > p:nth-child(2)';
    const itemSelector = '[id^="order-item-price-"]';
    const orders = await page.$$('[data-order-id]');
    for (const order of orders) {
        const status = await order.$eval(statusSelector, p => p.textContent); 
        if (status == "Open") { // only pull information from "Open" orders
            const orderId = await order.evaluate(div => div.getAttribute('data-order-id')); 
            const items = await order.$$(itemSelector); 
            let total = await addItemPrices(items); // calculate total cost
            orderMap[orderId] = total; // add orderId and total to map
        }
    }
}

// function navigates through all order pages and stores needed information into a Map
async function orderPages(page) { 
    const orderMap = {}; 
    const nextButtonSelector = '[data-testid="next-btn"]';
    await page.waitForSelector(nextButtonSelector);
    let currentPage = 1;
    const pageButtons = await page.$$('[data-testid="paginator-el"] .button'); 
    const totalPages = pageButtons.length + 1; // plus one to account for current page
    while (currentPage <= totalPages) { 
        await pullOrders(page, orderMap); // pull all order information from currentPage
        await page.click(nextButtonSelector); // go to next page
        currentPage++;
    }
    return orderMap;
}

// main function to run script and step through pages
async function scrapeOrders() { 
    const browser = await puppeteer.launch({ headless: false, args: ['--shm-size=1gb'] });
    const page = await browser.newPage();
    const startingUrl = 'https://web-scraping-exercise.fetchrewards.com';
    const buttonSelector = '[data-testid="button"]'; 
    try {
        await page.goto(startingUrl, { timeout: 60000 }); // open starting URL
        await page.waitForNavigation(); 
        await page.click(buttonSelector); // Step 1: click login
        await login(page); // Step 2: enter an email and password and log into the account
        await page.click(buttonSelector); // Step 3: click see orders, after a successful login
        await page.waitForNavigation(); 
        const orderMap = await orderPages(page); // Step 4: scrape order information to map
        for (const [key, value] of Object.entries(orderMap)) { // print map
            console.log(`${key}: ${value}`); 
        }
    } catch (err) {
        console.error(err);
    } finally {
        await browser.close(); 
    }
}

scrapeOrders(); // run script