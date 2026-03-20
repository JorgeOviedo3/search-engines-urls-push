const request = require('request-promise');
const { google } = require('googleapis');

function authorize(clientEmail, key) {
  const jwtClient = new google.auth.JWT(
    clientEmail,
    null,
    key.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/indexing'],
    null
  );

  return new Promise((resolve, reject) => {
    jwtClient.authorize((error, tokens) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(tokens);
    });
  });
}

module.exports = async (urlList, clientEmail, key) => {
  try {
    const tokens = await authorize(clientEmail, key);

    const responses = await Promise.all(
      urlList.map(url =>
        request({
          url: 'https://indexing.googleapis.com/v3/urlNotifications:publish',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          auth: { bearer: tokens.access_token },
          json: {
            url,
            type: 'URL_UPDATED'
          }
        })
      )
    );

    responses.forEach(response => {
      console.log(`google response: ${JSON.stringify(response)}`);
    });
  } catch (error) {
    console.log(`google error: ${JSON.stringify(error.message || error)}`);
  }
};
