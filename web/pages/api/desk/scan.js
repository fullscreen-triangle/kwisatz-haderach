import { classify } from '../../../lib/classifier';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { emailText } = req.body;
  if (!emailText || !emailText.trim()) {
    return res.status(400).json({ error: 'No email text provided' });
  }

  const result = classify(emailText);
  return res.json(result);
}
