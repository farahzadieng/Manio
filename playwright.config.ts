import { defineConfig,devices } from '@playwright/test'
export default defineConfig({testDir:'e2e',use:{baseURL:'http://localhost:4173',...devices['iPhone 13']},webServer:{command:'npm run dev -- --port 4173',url:'http://localhost:4173',reuseExistingServer:!process.env.CI},projects:[{name:'mobile-chromium',use:{browserName:'chromium',channel:process.env.CI?undefined:'chrome'}}]})
