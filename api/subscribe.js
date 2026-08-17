const crypto = require('crypto');

// Set to 'pending' if you want Mailchimp to send its confirmation email
// before adding someone to the list (double opt-in).
const NEW_MEMBER_STATUS = 'subscribed';
const TAG = 'Landing Page';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { MAILCHIMP_API_KEY, MAILCHIMP_SERVER_PREFIX, MAILCHIMP_AUDIENCE_ID } = process.env;
  if (!MAILCHIMP_API_KEY || !MAILCHIMP_SERVER_PREFIX || !MAILCHIMP_AUDIENCE_ID) {
    console.error('Missing Mailchimp env vars');
    return res.status(500).json({ error: "Something went wrong on our end. Please try again." });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const email = String(body.email || '').trim().toLowerCase();

  // Honeypot: real people leave this empty.
  if (body.website) return res.status(200).json({ ok: true });

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const base = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_AUDIENCE_ID}`;
  const auth = 'Basic ' + Buffer.from(`anystring:${MAILCHIMP_API_KEY}`).toString('base64');
  const hash = crypto.createHash('md5').update(email).digest('hex');

  try {
    // Add or update. status_if_new only applies to brand new contacts, so this
    // never resurrects someone who previously unsubscribed.
    const upsert = await fetch(`${base}/members/${hash}`, {
      method: 'PUT',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_address: email, status_if_new: NEW_MEMBER_STATUS })
    });

    if (!upsert.ok) {
      const err = await upsert.json().catch(() => ({}));

      // Someone who unsubscribed or was cleaned has to re-subscribe themselves.
      if (upsert.status === 400 && /compliance|signup form/i.test(err.title || '')) {
        return res.status(200).json({
          ok: true,
          message: "You're already on our list. Check your inbox for a confirmation from Mailchimp."
        });
      }

      console.error('Mailchimp upsert failed', upsert.status, err.title, err.detail);
      return res.status(502).json({ error: "We couldn't sign you up just now. Please try again." });
    }

    // Tags are a separate call. A failure here shouldn't cost us the signup.
    const tagged = await fetch(`${base}/members/${hash}/tags`, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: [{ name: TAG, status: 'active' }] })
    });
    if (!tagged.ok) console.error('Mailchimp tagging failed', tagged.status, await tagged.text());

    return res.status(200).json({
      ok: true,
      message: NEW_MEMBER_STATUS === 'pending'
        ? "Almost there. Check your inbox and confirm your subscription."
        : "You're in. Watch your inbox."
    });
  } catch (e) {
    console.error('Subscribe error', e);
    return res.status(500).json({ error: "Something went wrong on our end. Please try again." });
  }
};
