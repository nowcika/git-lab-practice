const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({testDir:'./tests',timeout:60000,retries:1,workers:1,reporter:[['list'],['json',{outputFile:'test-results/playwright-results.json'}]],use:{extraHTTPHeaders:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}}});
