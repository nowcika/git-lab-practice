const { defineConfig } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
let token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
try { if (!token) token = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}
const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
if (token) headers.Authorization = `Bearer ${token}`;
module.exports = defineConfig({testDir:'./tests',timeout:60000,retries:1,workers:1,reporter:[['list'],['json',{outputFile:'test-results/playwright-results.json'}]],use:{extraHTTPHeaders:headers}});
