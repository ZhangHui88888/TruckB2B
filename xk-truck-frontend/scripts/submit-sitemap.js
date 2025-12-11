/**
 * Submit Sitemap to Google Search Console
 * 
 * This script submits the sitemap to Google Search Console API.
 * Run this after deploying the site or when sitemap is updated.
 * 
 * Usage:
 *   node scripts/submit-sitemap.js
 * 
 * Required environment variables:
 * - GSC_CREDENTIALS: Google Cloud service account JSON
 * - GSC_SITE_URL: Site URL registered in GSC (e.g., https://xk-truck.cn)
 */

import { google } from 'googleapis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SITE_URL = process.env.GSC_SITE_URL || 'https://xk-truck.cn';
const SITEMAP_URL = `${SITE_URL}/sitemap-index.xml`;

async function submitSitemap() {
  console.log('🚀 Submitting sitemap to Google Search Console...');
  console.log(`📍 Site: ${SITE_URL}`);
  console.log(`📄 Sitemap: ${SITEMAP_URL}`);

  if (!process.env.GSC_CREDENTIALS) {
    console.error('❌ Error: GSC_CREDENTIALS environment variable not set');
    console.log('\nTo configure GSC API access:');
    console.log('1. Go to https://console.cloud.google.com');
    console.log('2. Create a project and enable Search Console API');
    console.log('3. Create a service account and download JSON key');
    console.log('4. Add the service account email to GSC as a user');
    console.log('5. Set GSC_CREDENTIALS environment variable with the JSON content');
    process.exit(1);
  }

  try {
    const credentials = JSON.parse(process.env.GSC_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/webmasters'],
    });

    const searchconsole = google.searchconsole({ version: 'v1', auth });

    // Submit sitemap
    await searchconsole.sitemaps.submit({
      siteUrl: SITE_URL,
      feedpath: SITEMAP_URL,
    });

    console.log('✅ Sitemap submitted successfully!');

    // Get sitemap status
    const response = await searchconsole.sitemaps.get({
      siteUrl: SITE_URL,
      feedpath: SITEMAP_URL,
    });

    console.log('\n📊 Sitemap Status:');
    console.log(`   Path: ${response.data.path}`);
    console.log(`   Last Submitted: ${response.data.lastSubmitted}`);
    console.log(`   Last Downloaded: ${response.data.lastDownloaded || 'Not yet'}`);
    console.log(`   Warnings: ${response.data.warnings || 0}`);
    console.log(`   Errors: ${response.data.errors || 0}`);

    if (response.data.contents) {
      console.log('\n📝 Contents:');
      for (const content of response.data.contents) {
        console.log(`   - ${content.type}: ${content.submitted} submitted, ${content.indexed} indexed`);
      }
    }

  } catch (error) {
    if (error.code === 403) {
      console.error('❌ Permission denied. Make sure the service account has access to the site in GSC.');
    } else if (error.code === 404) {
      console.error('❌ Site not found. Make sure the site is verified in Google Search Console.');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

// Also list all sitemaps
async function listSitemaps() {
  if (!process.env.GSC_CREDENTIALS) return;

  try {
    const credentials = JSON.parse(process.env.GSC_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    const searchconsole = google.searchconsole({ version: 'v1', auth });

    const response = await searchconsole.sitemaps.list({
      siteUrl: SITE_URL,
    });

    if (response.data.sitemap && response.data.sitemap.length > 0) {
      console.log('\n📋 All Sitemaps:');
      for (const sitemap of response.data.sitemap) {
        console.log(`   - ${sitemap.path}`);
        console.log(`     Last Submitted: ${sitemap.lastSubmitted}`);
        console.log(`     Status: ${sitemap.errors > 0 ? '❌ Has errors' : '✅ OK'}`);
      }
    }
  } catch (error) {
    // Ignore errors for listing
  }
}

submitSitemap().then(() => listSitemaps());
