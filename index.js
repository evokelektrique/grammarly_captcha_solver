const fs = require("fs");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());
const { executablePath } = require("puppeteer");

// Set api key
const apiKey = "";
if (fs.existsSync("./plugin/js/config_ac_api_key.js")) {
    let confData = fs.readFileSync("./plugin/js/config_ac_api_key.js", "utf8");
    confData = confData.replace(
        /antiCapthaPredefinedApiKey = ''/g,
        `antiCapthaPredefinedApiKey = '${apiKey}'`
    );
    fs.writeFileSync("./plugin/js/config_ac_api_key.js", confData, "utf8");
} else {
    console.error("Plugin configuration not found!");
}

// Main stuff
(async () => {

    // Init browser
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: executablePath(),
        ignoreDefaultArgs: ["--disable-extensions", "--enable-automation"],
        args: [
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
        ],
    });

    // Credentials
    const email = "";
    const password = "";

    // Open Grammarly login page
    const page = await browser.newPage();
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
        .waitForSelector(".antigate_solver.solved")
        .catch((error) => console.log("failed to wait for the selector"));
    console.log("recaptcha solved");

    // Wait for redirect
    await page.waitForNavigation("networkidle2");

    // Check if redirected url is correct
    console.log(page.url() === "https://app.grammarly.com/");
})();
