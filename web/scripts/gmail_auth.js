/**
 * One-time Gmail OAuth2 setup.
 * Run: node scripts/gmail_auth.js
 *
 * Prerequisites:
 *   1. Go to console.cloud.google.com
 *   2. Create a project → Enable "Gmail API"
 *   3. APIs & Services → Credentials → Create → OAuth 2.0 Client ID → Desktop app
 *   4. Download JSON → save as web/credentials.json
 *   5. Run this script — browser opens → sign in → done.
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials.json');
const TOKEN_PATH = path.join(__dirname, '..', '.gmail_token.json');

async function main() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error('\nMissing credentials.json in web/ directory.');
    console.error('Steps:');
    console.error('  1. console.cloud.google.com → new project');
    console.error('  2. Enable Gmail API');
    console.error('  3. Credentials → Create → OAuth 2.0 Client ID → Desktop app');
    console.error('  4. Download JSON → rename to credentials.json → put in web/');
    process.exit(1);
  }

  if (fs.existsSync(TOKEN_PATH)) {
    console.log('Token already exists at .gmail_token.json — you are already set up.');
    console.log('Delete .gmail_token.json and re-run to re-authorize.');
    process.exit(0);
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_id, client_secret } = credentials.installed || credentials.web;

  // Start a local server to capture the OAuth callback
  const server = http.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    `http://localhost:${port}`
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\nOpen this URL in your browser:\n');
  console.log(authUrl);
  console.log('\nWaiting for authorization...');

  await new Promise((resolve, reject) => {
    server.on('request', async (req, res) => {
      const { query } = url.parse(req.url, true);

      if (query.error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<h2>Authorization failed: ${query.error}</h2><p>Close this tab and try again.</p>`);
        server.close();
        reject(new Error(query.error));
        return;
      }

      if (query.code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h2>Done!</h2><p>Authorization complete. Close this tab.</p>');
        server.close();

        try {
          const { tokens } = await oAuth2Client.getToken(query.code);
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
          console.log('\nSaved .gmail_token.json');
          console.log('Restart the dev server — Gmail inbox will load automatically.');
          resolve();
        } catch (e) {
          reject(e);
        }
      }
    });
  });
}

main().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
