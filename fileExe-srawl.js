const readline = require('readline');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { URL } = require('url');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function crawl(url) {
  const visitedUrls = new Set();
  const urlsAndExtensions = [];

  async function visit(url) {
    try {
      // Send a GET request to the URL
      const response = await axios.get(url);

      // Load the HTML content
      const $ = cheerio.load(response.data);

      // Find all anchor tags and extract the URLs
      $('a').each((index, element) => {
        const href = $(element).attr('href');
        if (href) {
          const absoluteUrl = resolveAbsoluteUrl(url, href);
          if (isInternalUrl(url, absoluteUrl) && !visitedUrls.has(absoluteUrl)) {
            visitedUrls.add(absoluteUrl);
            visit(absoluteUrl);
          }
        }
      });

      // Find all script tags and extract the JS file URLs
      $('script').each((index, element) => {
        const src = $(element).attr('src');
        if (src) {
          const absoluteUrl = resolveAbsoluteUrl(url, src);
          if (isInternalUrl(url, absoluteUrl) && !visitedUrls.has(absoluteUrl)) {
            visitedUrls.add(absoluteUrl);
            urlsAndExtensions.push({
              url: absoluteUrl,
              extension: 'js',
            });
          }
        }
      });

      // Find all link tags with rel="stylesheet" and extract the CSS file URLs
      $('link[rel="stylesheet"]').each((index, element) => {
        const href = $(element).attr('href');
        if (href) {
          const absoluteUrl = resolveAbsoluteUrl(url, href);
          if (isInternalUrl(url, absoluteUrl) && !visitedUrls.has(absoluteUrl)) {
            visitedUrls.add(absoluteUrl);
            urlsAndExtensions.push({
              url: absoluteUrl,
              extension: 'css',
            });
          }
        }
      });
    } catch (error) {
      console.error(`Failed to visit URL: ${url}`);
    }
  }

  function resolveAbsoluteUrl(baseUrl, relativeUrl) {
    try {
      return new URL(relativeUrl, baseUrl).href;
    } catch (error) {
      console.error(`Failed to resolve absolute URL for: ${relativeUrl}`);
      return null;
    }
  }

  function isInternalUrl(baseUrl, url) {
    try {
      const baseHostname = new URL(baseUrl).hostname;
      const urlHostname = new URL(url).hostname;
      return baseHostname === urlHostname;
    } catch (error) {
      console.error(`Failed to determine if URL is internal: ${url}`);
      return false;
    }
  }

  return visit(url)
    .then(() => urlsAndExtensions)
    .catch(error => {
      console.error(error);
      return [];
    });
}

rl.question('Enter the website URL: ', (url) => {
  crawl(url)
    .then(urlsAndExtensions => {
      const outputFilePath = 'urls_and_extensions.txt';

      const outputStream = fs.createWriteStream(outputFilePath);
      outputStream.once('open', () => {
        urlsAndExtensions.forEach(({ url, extension }) => {
          outputStream.write(`${url} - ${extension}\n`);
        });
        outputStream.end();
        console.log(`URLs and extensions saved to ${outputFilePath}`);
        rl.close();
      });
    })
    .catch(error => {
      console.error(error);
      rl.close();
    });
});
