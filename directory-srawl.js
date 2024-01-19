const axios = require('axios');
const fs = require('fs');
const { URL } = require('url');

async function crawlWebsite(url) {
  const visitedUrls = new Set();
  const directories = new Set();
  const fileExtensions = new Set();

  async function visit(url) {
    try {
      const response = await axios.get(url);
      const links = extractLinks(response.data);
      const baseUrl = new URL(url).origin;

      for (const link of links) {
        const absoluteUrl = new URL(link, baseUrl).href;
        if (isInternalUrl(baseUrl, absoluteUrl) && !visitedUrls.has(absoluteUrl)) {
          visitedUrls.add(absoluteUrl);

          if (isDirectory(absoluteUrl)) {
            directories.add(absoluteUrl);
            await visit(absoluteUrl);
          } else if (isFileWithExtensions(absoluteUrl, ['.js', '.css'])) {
            fileExtensions.add(absoluteUrl);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to visit URL: ${url}`);
    }
  }

  function extractLinks(html) {
    const links = [];
    const linkRegex = /href="([^"]*)"/g;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      links.push(match[1]);
    }

    return links;
  }

  function isInternalUrl(baseUrl, url) {
    const baseHostname = new URL(baseUrl).hostname;
    const urlHostname = new URL(url).hostname;
    return baseHostname === urlHostname;
  }

  function isDirectory(url) {
    return url.endsWith('/');
  }

  function isFileWithExtensions(url, extensions) {
    const fileExtension = url.split('.').pop();
    return extensions.includes(`.${fileExtension}`);
  }

  await visit(url);

  return {
    directories: Array.from(directories),
    fileExtensions: Array.from(fileExtensions),
  };
}

function saveToFile(data, filePath) {
  const fileContent = data.join('\n');
  fs.writeFile(filePath, fileContent, (err) => {
    if (err) {
      console.error(`Failed to save to file: ${filePath}`);
    } else {
      console.log(`Output saved to ${filePath}`);
    }
  });
}

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter the website URL: ', (url) => {
  const websiteUrl = url.trim(); // Remove leading/trailing whitespace

  crawlWebsite(websiteUrl)
    .then((crawlResult) => {
      const { directories, fileExtensions } = crawlResult;
      const outputData = [
        'Directories:',
        ...directories,
        '',
        'File Extensions:',
        ...fileExtensions
      ];
      const outputFilePath = 'output.txt'; // Specify the output file path
      saveToFile(outputData, outputFilePath);
      rl.close();
    })
    .catch((error) => {
      console.error(error);
      rl.close();
    });
});