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
  const directories = [];

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
            if (isDirectory(absoluteUrl)) {
              directories.push(absoluteUrl);
              visit(absoluteUrl);
            }
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

  function isDirectory(url) {
    return url.endsWith('/');
  }

  return visit(url)
    .then(() => directories)
    .catch(error => {
      console.error(error);
      return [];
    });
}

console.log('\x1b[33m%s\x1b[0m', 'Author: @Securi3yTalent'); 
console.log('\x1b[33m%s\x1b[0m', 'join_us: https://t.me/Securi3yTalent'); 
console.cog(`
  example: node script.js then inter URL (https://example.com)
  
`)
//cyan


rl.question('Enter the website URL: ', (url) => {
  crawl(url)
    .then(directories => {
      const outputFilePath = 'directories.txt';

      const outputStream = fs.createWriteStream(outputFilePath);
      outputStream.once('open', () => {
        directories.forEach(directory => {
          outputStream.write(`${directory}\n`);
        });
        outputStream.end();
        console.log(`Directories saved to ${outputFilePath}`);
        rl.close();
      });
    })
    .catch(error => {
      console.error(error);
      rl.close();
    });
});
