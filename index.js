const core = require('@actions/core');
const xmlConvert = require('xml-js');
const request = require('request-promise');
const submitBaidu = require('./api/baidu.js');
const submitBing = require('./api/bing.js');
const submitGoogle = require('./api/google.js');

function normalizeArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function readText(node) {
  if (node == null) {
    return '';
  }

  if (typeof node === 'string') {
    return node.trim();
  }

  if (typeof node._text === 'string') {
    return node._text.trim();
  }

  if (typeof node._cdata === 'string') {
    return node._cdata.trim();
  }

  return '';
}

async function collectUrlsFromSitemap(sitemapUrl, visited = new Set()) {
  if (visited.has(sitemapUrl)) {
    return [];
  }

  visited.add(sitemapUrl);

  const xml = await request({
    url: sitemapUrl,
    method: 'GET',
    gzip: true,
    headers: {
      'User-Agent': 'search-engines-urls-push'
    }
  });

  const sitemap = xmlConvert.xml2js(xml, {
    compact: true,
    trim: true,
    alwaysArray: ['url', 'sitemap']
  });

  const urlEntries = normalizeArray(sitemap.urlset && sitemap.urlset.url)
    .map(item => readText(item.loc))
    .filter(Boolean);

  if (urlEntries.length > 0) {
    return urlEntries;
  }

  const nestedSitemaps = normalizeArray(sitemap.sitemapindex && sitemap.sitemapindex.sitemap)
    .map(item => readText(item.loc))
    .filter(Boolean);

  if (nestedSitemaps.length === 0) {
    throw new Error(`Unsupported sitemap format: ${sitemapUrl}`);
  }

  const nestedUrlLists = await Promise.all(
    nestedSitemaps.map(item => collectUrlsFromSitemap(item, visited))
  );

  return nestedUrlLists.flat();
}

async function run() {
  const site = core.getInput('site', { required: true }).trim();
  const sitemap = core.getInput('sitemap', { required: true }).trim();
  const countInput = core.getInput('count').trim();
  const baiduToken = core.getInput('baidu-token').trim();
  const bingToken = core.getInput('bing-token').trim();
  const googleClientEmail = core.getInput('google-client-email').trim();
  const googlePrivateKey = core.getInput('google-private-key').trim();
  const count = countInput ? Number.parseInt(countInput, 10) : null;

  if (countInput && (!Number.isInteger(count) || count <= 0)) {
    throw new Error('Input "count" must be a positive integer.');
  }

  const urlList = await collectUrlsFromSitemap(sitemap);
  const submitUrlList = count ? urlList.slice(0, count) : urlList;

  if (submitUrlList.length === 0) {
    core.info('No URLs found to submit.');
    return;
  }

  const tasks = [];

  if (baiduToken) {
    tasks.push(submitBaidu(site, submitUrlList, baiduToken));
  }

  if (bingToken) {
    tasks.push(submitBing(site, submitUrlList, bingToken));
  }

  if (googleClientEmail && googlePrivateKey) {
    tasks.push(submitGoogle(submitUrlList, googleClientEmail, googlePrivateKey));
  }

  if (tasks.length === 0) {
    core.warning('No search engine credentials provided. Nothing was submitted.');
    return;
  }

  await Promise.all(tasks);
}

run().catch(error => {
  core.setFailed(error.message);
});
