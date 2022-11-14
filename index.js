const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());
const { executablePath } = require("puppeteer");
const { exit } = require("process");

const list_path = path.resolve("./list.txt");
const plugin_path = path.resolve("./plugin/js/config_ac_api_key.js"); // Convert relative to absolute path
const global_args = [
    "--disable-web-security",
    "--disable-features=IsolateOrigins,site-per-process",
    "--allow-running-insecure-content",
    "--disable-blink-features=AutomationControlled",
    "--no-sandbox",
    "--mute-audio",
    "--no-zygote",
    "--no-xshm",
    "--window-size=1920,1080",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--enable-webgl",
    "--ignore-certificate-errors",
    "--lang=en-US,en;q=0.9",
    "--password-store=basic",
    "--disable-gpu-sandbox",
    "--disable-software-rasterizer",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-infobars",
    "--disable-breakpad",
    "--disable-canvas-aa",
    "--disable-2d-canvas-clip-aa",
    "--disable-gl-drawing-for-tests",
    "--enable-low-end-device-mode",
    "--disable-extensions-except=./plugin",
    "--load-extension=./plugin",
    "--proxy-server=127.0.0.1:17000", // Proxy server
];

// Set api key
const apiKey = "";
if (fs.existsSync(plugin_path)) {
    let confData = fs.readFileSync(plugin_path, "utf8");
    confData = confData.replace(
        /antiCapthaPredefinedApiKey = ''/g,
        `antiCapthaPredefinedApiKey = '${apiKey}'`
    );
    fs.writeFileSync(plugin_path, confData, "utf8");
} else {
    console.error("Plugin configuration not found!");
}

// Read the list
const list_data = fs.readFileSync(list_path, { encoding: "utf-8" });
list = generate_list(list_data);

// Main stuff
(async () => {
    // Init browser
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: executablePath(),
        ignoreDefaultArgs: ["--disable-extensions", "--enable-automation"],
        args: global_args,
    });

    const page = await browser.newPage();

    list.forEach(async (credential) => {
        await retry(() => {
            operation(page, credential);
        }, 3);
    });
})();

/**
 *
 * @param {Array} promiseFactory List of promises
 * @param {Integer} retryCount Revolution counter
 *
 * @returns mixed
 */
async function retry(promiseFactory, retryCount) {
    try {
        return await promiseFactory();
    } catch (error) {
        if (retryCount <= 0) {
            throw error;
        }
        return await retry(promiseFactory, retryCount - 1);
    }
}

/**
 *
 * @param {String} data Given list data
 *
 * @returns Array of list
 */
function generate_list(data) {
    if (data === "" || data === undefined) {
        console.log("empty list given");
    }

    const list = [];

    data = data.split("\n");
    data.forEach((item) => {
        const temp_item = item.split(":");
        const email = temp_item[0];
        const password = temp_item[1];

        list.push({ email, password });
    });

    return list;
}

/**
 * Solve the grammarly captcha
 *
 * @param {Puppeteer} page Browser tab
 * @param {Object} credential Account credential
 */
async function operation(page, credential) {
    // Credentials
    const email = credential.email;
    const password = credential.password;

    // Open Grammarly login page
    const url = "https://www.grammarly.com/signin";

    try {
        await page.goto(url, {
            waitUntil: "networkidle0",
        });
    } catch (e) {
        console.error("err while loading the page: " + e);
    }

    // Disable navigation timeout errors
    await page.setDefaultNavigationTimeout(0);

    // Wait for Continue button text
    await page.waitForFunction(
        "document.querySelector('button[data-qa=\"btnLogin\"]').innerText == 'Continue'"
    );
    console.log("Found submit button");

    // Type email
    await page.focus('input[name="email"]');
    await page.keyboard.type(email);

    // Click on Continue button
    await page.click("button[data-qa='btnLogin']");
    console.log("Clicked submit button");

    // Wait for Sign in button text
    await page.waitForFunction(
        "document.querySelector('button[data-qa=\"btnLogin\"]').innerText == 'Sign in'"
    );
    console.log("Found submit button");

    // Type Password
    await page.focus('input[name="password"]');
    await page.keyboard.type(password);

    // Click on Sign in button text
    await page.click("button[data-qa='btnLogin']");
    console.log("Clicked submit button");

    // Solve captcha
    await page
        .waitForSelector(".antigate_solver.solved", { timeout: 40000 }) // 40s timeout
        .catch(async () => {
            console.log("failed to wait for the selector");
            throw new Error("failed to solve the captcha");
        });
    console.log("recaptcha solved");

    // Wait for redirect
    await page.waitForNavigation("networkidle2");

    // Check if redirected url is correct
    if (page.url() === "https://app.grammarly.com/") {
        console.log("Operation done");
    }

    // Close the tab
    await page.close();
}
