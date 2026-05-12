import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), '.gmail_token.json');

function getAuthClient() {
  if (!fs.existsSync(CREDENTIALS_PATH) || !fs.existsSync(TOKEN_PATH)) {
    const err = new Error('not_configured');
    err.code = 'not_configured';
    throw err;
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oAuth2Client.setCredentials(token);

  // Persist refreshed access tokens automatically
  oAuth2Client.on('tokens', newTokens => {
    const updated = { ...token, ...newTokens };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(updated, null, 2));
  });

  return oAuth2Client;
}

function decodeBase64Url(data) {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function extractTextBody(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
      if (part.parts) {
        const nested = extractTextBody(part);
        if (nested) return nested;
      }
    }
  }
  return '';
}

function getHeader(headers, name) {
  return headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

export async function fetchInboxEmails(daysBack = 14) {
  const auth = getAuthClient();
  const gmail = google.gmail({ version: 'v1', auth });

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: `newer_than:${daysBack}d`,
    maxResults: 60,
  });

  const messages = listRes.data.messages || [];
  if (messages.length === 0) return [];

  const emails = [];

  for (let i = 0; i < messages.length; i += 10) {
    const batch = messages.slice(i, i + 10);
    const details = await Promise.all(
      batch.map(m => gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' }))
    );

    for (const { data } of details) {
      const headers = data.payload?.headers || [];
      const from = getHeader(headers, 'from');
      const subject = getHeader(headers, 'subject');
      const date = getHeader(headers, 'date');
      const body = extractTextBody(data.payload).slice(0, 3000);

      const addrMatch = from.match(/<([^>]+)>/);
      emails.push({
        uid: data.id,
        subject: subject || '(no subject)',
        from,
        fromAddress: addrMatch ? addrMatch[1] : from,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        body,
      });
    }
  }

  return emails; // Gmail API returns newest first
}
