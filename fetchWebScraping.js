// Michael Oram //
// Fetch Web Scraping Coding Exercise //

const puppeteer = require('puppeteer');

async function login(page) { // function used to log into an account
    const email = 'ex@example.com';
    const password = 'password123';
    const emailSelector = '#email'; // email text box selector 
    const passwordSelector = '#password'; // password text box selector 
    const signInButtonSelector = '[data-testid="button"]'; // sign in button selector 
    
    let loginSuccessful = false;
    while (!loginSuccessful) {
        await page.waitForSelector(emailSelector); // wait for text boxes to load
        await page.waitForSelector(passwordSelector);
        await page.type(emailSelector, email); // enter email address
        await page.type(passwordSelector, password); // enter password
        await page.click(signInButtonSelector); // click sign In
        if (page.url().includes('/signin')) { // check if URL changed
            console.log("login failed..");
            await Promise.all([
                page.type(emailSelector, ''), // clear email
                page.type(passwordSelector, ''), // clear password
            ]);
        } else {
            console.log("login successful.");
            loginSuccessful = true;
        }
    }
  }

  async function extractOrdersFromPage(page, orders) {
    const statusSelector = 'p.text-xs.uppercase + p'; // status selector
    const itemSelector = '.svelte-1sd6u5w'; // items selector
    
    const results = []; // an array of orderIds and totals from current page of orders
    for (const order of orders) { // go through each order
      const status = await order.$eval(statusSelector, p => p.textContent); // extract status
      if (status !== 'Open') { // skip if not in "Open" status
        continue;
      }
      
      const orderId = await order.evaluate(div => div.getAttribute('data-order-id')); // extract orderId
      const items = await order.$$(itemSelector); // extract all items from order
      const itemPricesText = await Promise.all(items.map(item => item.$eval('p:nth-child(2)', p => p.textContent))); // extract all item prices
      const totalPrice = itemPricesText.reduce((sum, price) => sum + parseFloat(price.substring(1)), 0); // add all item prices to get total
      results.push([orderId, totalPrice]); // add orderId and totalPrice to results array
    }
    return results;
}


async function extractOrders(page) {
    const orderMap = new Map(); // create new map
    const ordersSelector = '[data-order-id]'; // selector for all orders
    let currentPage = 1; // order page tracker
    while (true) {
      const orders = await page.$$(ordersSelector); // extract all orders on page
      for (const [orderId, totalPrice] of extractOrdersFromPage(page, orders)) { // extract information for all orders on page
        orderMap.set(orderId, totalPrice); // add information to map
      }
      const nextButton = await page.$('[data-testid="next-btn"]'); // arrow button at botton of order page
      if (nextButton) { // check if there is another page of orders
        currentPage++; // increment page
        await Promise.all([
          page.click('[data-testid="next-btn"]'), // click button
          page.waitForNavigation(), // wait to load
        ]);
      } else {
        break; // last page, end loop
      }
    }
    return orderMap;
  }


async function scrapeOrders() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const startingUrl = 'https://web-scraping-exercise.fetchrewards.com';
    const buttonSelector = '[data-testid="button"]'; 
    try {
        await page.goto(startingUrl, { timeout: 60000 }); // open starting URL
        await page.waitForNavigation(); // wait for page to load
        await page.click(buttonSelector); // click login
        console.log('step 1 complete');
        await login(page); // enter an email and password and log into the account
        console.log('Step 2 complete');
        await Promise.all([
          page.click(buttonSelector), // click see orders, after a successful login
          page.waitForNavigation(), // wait for orders page to load
        ]);
        console.log('Step 3 complete');
        const orderMap = await extractOrders(page); // extract "Open" orders from all order pages
        console.log(orderMap); // print map
        console.log('Step 4 complete');
    } catch (err) {
        console.error(err);
    } finally {
        await browser.close(); 
    }
}

scrapeOrders(); // run script