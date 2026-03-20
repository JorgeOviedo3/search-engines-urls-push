const request = require('request-promise');

module.exports = async (site, urlList, token) => {
  try {
    const data = urlList.join('\n');
    const res = await request({
      url: `http://data.zz.baidu.com/urls?site=${site}&token=${token}`,
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: data
    });

    console.log(`baidu response: ${JSON.stringify(res)}`);
  } catch (error) {
    console.log(`baidu error: ${JSON.stringify(error.message || error)}`);
  }
};
