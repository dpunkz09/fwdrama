/**
 * Cookie Fetcher for DramaDunyam API
 * 
 * This script uses Playwright to visit dramadunyam.com and extract cookies
 * Run: node cookie-fetcher.js
 * 
 * Install Playwright first: npm install -D playwright
 */

import { chromium } from 'playwright';

async function fetchCookies() {
    console.log('🚀 Launching browser...');
    
    const browser = await chromium.launch({
        headless: true, // Set to false to see the browser
    });
    
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    console.log('🌐 Visiting dramadunyam.com...');
    await page.goto('https://dramadunyam.com/en', {
        waitUntil: 'networkidle',
        timeout: 30000
    });
    
    // Wait a bit for Cloudflare challenge to complete
    console.log('⏳ Waiting for cookies to be set...');
    await page.waitForTimeout(5000);
    
    // Get all cookies
    const cookies = await context.cookies();
    
    // Format cookies as a single string
    const cookieString = cookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
    
    console.log('✅ Cookies fetched successfully!');
    console.log('📋 Found ' + cookies.length + ' cookies');
    
    // Output in a format that the Laravel command can parse
    console.log('DRAMADUNYAM_COOKIE=' + cookieString);
    
    await browser.close();
}

fetchCookies().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
