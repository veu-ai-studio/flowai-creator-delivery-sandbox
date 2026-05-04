import { chromium } from "npm:playwright@1.48.0";

Deno.serve(async (req) => {
  let browser;
  try {
    console.log("[CRAWL] Request received");
    const { url } = await req.json();
    console.log("[CRAWL] URL:", url);

    if (!url || !url.startsWith("https://")) {
      console.log("[CRAWL] Invalid URL format");
      return Response.json(
        { success: false, error: "URL must be a valid HTTPS URL" },
        { status: 400 }
      );
    }

    console.log("[CRAWL] Launching browser...");
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });
    console.log("[CRAWL] Browser launched successfully");

    console.log("[CRAWL] Creating new page...");
    const page = await browser.newPage();
    const errors = [];

    page.on("pageerror", (e) => {
      console.log("[CRAWL] Page error:", e.message);
      errors.push(e.message);
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log("[CRAWL] Console error:", msg.text());
        errors.push(msg.text());
      }
    });

    console.log("[CRAWL] Navigating to:", url);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log("[CRAWL] Page loaded");

    console.log("[CRAWL] Extracting data...");
    const title = await page.title();
    console.log("[CRAWL] Title:", title);

    const links = await page.$$eval("a", (els) =>
      els.map((e) => ({ text: e.innerText.trim(), href: e.href })).slice(0, 20)
    ).catch(() => []);
    console.log("[CRAWL] Links found:", links.length);

    const buttons = await page.$$eval("button", (els) =>
      els.map((e) => e.innerText.trim()).slice(0, 15)
    ).catch(() => []);
    console.log("[CRAWL] Buttons found:", buttons.length);

    const forms = await page.$$eval("form", (els) => els.length).catch(() => 0);
    console.log("[CRAWL] Forms found:", forms);

    const images = await page.$$eval("img", (els) => els.length).catch(() => 0);
    console.log("[CRAWL] Images found:", images);

    const headings = await page.$$eval("h1, h2, h3", (els) =>
      els.map((e) => e.innerText.trim()).slice(0, 10)
    ).catch(() => []);
    console.log("[CRAWL] Headings found:", headings.length);

    console.log("[CRAWL] Taking screenshot...");
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    const screenshotBase64 = btoa(String.fromCharCode(...new Uint8Array(screenshotBuffer)));
    console.log("[CRAWL] Screenshot captured, size:", screenshotBase64.length);

    await browser.close();
    console.log("[CRAWL] Browser closed");

    console.log("[CRAWL] Success - returning data");
    return Response.json({
      success: true,
      url,
      title,
      links: links.filter((l) => l.text),
      buttons: buttons.filter((b) => b),
      forms,
      images,
      headings,
      errors,
      screenshotBase64,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRAWL] CRITICAL ERROR:", error);
    console.error("[CRAWL] Error message:", error.message);
    console.error("[CRAWL] Error stack:", error.stack);
    
    // Ensure browser is closed
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        console.error("[CRAWL] Error closing browser:", closeErr);
      }
    }

    return Response.json(
      {
        success: false,
        error: error.message || "Playwright crawl failed",
        errorType: error.constructor.name,
        details: error.stack,
      },
      { status: 500 }
    );
  }
});