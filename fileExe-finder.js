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
  const urlsAndExamples = {};

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
      $('script[src]').each((index, element) => {
        const src = $(element).attr('src');
        if (src) {
          const absoluteUrl = resolveAbsoluteUrl(url, src);
          if (isInternalUrl(url, absoluteUrl) && !visitedUrls.has(absoluteUrl)) {
            visitedUrls.add(absoluteUrl);
            addToExamples('js', absoluteUrl);
          }
        }
      });

      // Find all link tags with rel="stylesheet" and extract the CSS file URLs
      $('link[rel="stylesheet"][href]').each((index, element) => {
        const href = $(element).attr('href');
        if (href) {
          const absoluteUrl = resolveAbsoluteUrl(url, href);
          if (isInternalUrl(url, absoluteUrl) && !visitedUrls.has(absoluteUrl)) {
            visitedUrls.add(absoluteUrl);
            addToExamples('css', absoluteUrl);
          }
        }
      });

      // Additional file types examples
      addFileTypeExamples($, 'img', 'src', 'png');
      addFileTypeExamples($, 'img', 'src', 'jpg');
      addFileTypeExamples($, 'img', 'src', 'jpeg');
      addFileTypeExamples($, 'img', 'src', 'gif');
      addFileTypeExamples($, 'img', 'src', 'svg');
      addFileTypeExamples($, 'img', 'src', 'ico');
      addFileTypeExamples($, 'audio', 'src', 'mp3');
      addFileTypeExamples($, 'video', 'src', 'mp4');
      addFileTypeExamples($, 'source', 'src', 'ogg');
      addFileTypeExamples($, 'source', 'src', 'webm');
      addFileTypeExamples($, 'a', 'href', 'pdf');
      addFileTypeExamples($, 'a', 'href', 'doc');
      addFileTypeExamples($, 'a', 'href', 'docx');
      addFileTypeExamples($, 'a', 'href', 'xls');
      addFileTypeExamples($, 'a', 'href', 'xlsx');
      addFileTypeExamples($, 'a', 'href', 'ppt');
      addFileTypeExamples($, 'a', 'href', 'pptx');
      addFileTypeExamples($, 'link[rel="icon"]', 'href', 'ico');
      addFileTypeExamples($, 'audio', 'src', 'ogg');
      addFileTypeExamples($, 'audio', 'src', 'webm');
      addFileTypeExamples($, 'source', 'src', 'pdf');
      addFileTypeExamples($, 'source', 'src', 'txt');
      addFileTypeExamples($, 'source', 'src', 'md');
      // Add more file types as needed

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

  function addToExamples(extension, absoluteUrl) {
    if (!urlsAndExamples[extension]) {
      urlsAndExamples[extension] = [];
    }
    urlsAndExamples[extension].push(absoluteUrl);
  }

  function addFileTypeExamples($, tag, attribute, extension) {
    $(`${tag}[${attribute}]`).each((index, element) => {
      const fileUrl = $(element).attr(attribute);
      if (fileUrl) {
        const absoluteUrl = resolveAbsoluteUrl(url, fileUrl);
        if (isInternalUrl(url, absoluteUrl) && !visitedUrls.has(absoluteUrl)) {
          visitedUrls.add(absoluteUrl);
          addToExamples(extension, absoluteUrl);
        }
      }
    });
  }

  return visit(url)
    .then(() => urlsAndExamples)
    .catch(error => {
      console.error(error);
      return {};
    });
}

rl.question('Enter the website URL: ', (url) => {
  crawl(url)
    .then(urlsAndExamples => {
      const outputFilePath = 'urls_and_examples.txt';

      const outputStream = fs.createWriteStream(outputFilePath);
      outputStream.once('open', () => {
        Object.entries(urlsAndExamples).forEach(([extension, urls]) => {
          urls.forEach((url) => {
            outputStream.write(`${url} - ${extension}\n`);
          });
        });
        outputStream.end();
        console.log(`Examples saved to ${outputFilePath}`);
        rl.close();
      });
    })
    .catch(error => {
      console.error(error);
      rl.close();
    });
});
