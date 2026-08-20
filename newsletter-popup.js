/*
 * Newsletter popup.
 *
 * Shows once per visitor, then never again. The "seen" flag is first-party
 * localStorage, not a cookie: it never leaves the browser and nothing reads it
 * but this file, so it doesn't put the site into consent-banner territory.
 *
 * Include on any page except /newsletter and /contact, which already have a
 * form of their own:
 *   <script defer src="/newsletter-popup.js"></script>
 */
(function () {
  var SEEN_KEY = 'fga_newsletter_popup_seen';
  var SCROLL_TRIGGER = 0.5; // fire once half the page has been read

  // localStorage throws in Safari private mode, so every access is guarded.
  function seen() {
    try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; }
  }
  function markSeen() {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
  }

  if (seen()) return;

  // Someone who signs up through a form already on the page shouldn't then be
  // asked again by the popup.
  document.addEventListener('submit', function (e) {
    if (e.target && e.target.matches && e.target.matches('.newsletter-form, .signup-form')) markSeen();
  }, true);

  var CSS = [
    '.nl-pop-overlay{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;',
    'background:rgba(42,35,48,.55);opacity:0;visibility:hidden;transition:opacity .3s ease,visibility .3s ease;}',
    '.nl-pop-overlay.open{opacity:1;visibility:visible;}',
    '.nl-pop{position:relative;width:100%;max-width:460px;background:#fff;border-radius:18px;padding:44px 40px 36px;',
    'text-align:center;box-shadow:0 40px 80px -30px rgba(74,58,85,.5);transform:translateY(16px) scale(.98);',
    'transition:transform .35s cubic-bezier(.22,1,.36,1);max-height:calc(100vh - 48px);overflow-y:auto;}',
    '.nl-pop-overlay.open .nl-pop{transform:none;}',
    // Don't inherit the host page's reset, or lack of one.
    '.nl-pop,.nl-pop *{box-sizing:border-box;}',
    '.nl-pop-close{position:absolute;top:12px;right:14px;background:none;border:none;cursor:pointer;font-size:26px;',
    'line-height:1;color:#6B5F70;padding:6px 10px;border-radius:50%;transition:color .2s,background .2s;}',
    '.nl-pop-close:hover{color:#2A2330;background:rgba(74,58,85,.07);}',
    '.nl-pop-logo{height:74px;width:auto;margin:0 auto 18px;display:block;}',
    ".nl-pop h2{font-family:'Playfair Display',Georgia,serif;font-weight:400;font-size:26px;line-height:1.28;",
    'color:#4A3A55;margin:0 0 12px;}',
    '.nl-pop h2 em{font-style:italic;color:#D8547F;}',
    ".nl-pop p.nl-pop-sub{font-family:'Poppins',system-ui,sans-serif;font-size:14.5px;line-height:1.65;color:#6B5F70;margin:0 0 24px;}",
    '.nl-pop form{display:flex;flex-direction:column;gap:12px;}',
    ".nl-pop input[type=email]{width:100%;border:1px solid rgba(74,58,85,.18);outline:none;padding:15px 22px;background:#fff;",
    "font-family:'Poppins',system-ui,sans-serif;font-size:15px;color:#2A2330;border-radius:999px;transition:border-color .2s;}",
    '.nl-pop input[type=email]:focus{border-color:#7C5E8E;}',
    '.nl-pop input::placeholder{color:#6B5F70;}',
    '.nl-pop button[type=submit]{border:none;cursor:pointer;padding:16px 30px;border-radius:999px;background:#D8547F;color:#fff;',
    "font-family:'Poppins',system-ui,sans-serif;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;",
    'box-shadow:0 12px 26px -10px rgba(216,84,127,.5);transition:background .25s,transform .25s,box-shadow .25s;}',
    '.nl-pop button[type=submit]:hover{background:#C43D6C;transform:translateY(-1px);box-shadow:0 16px 32px -10px rgba(216,84,127,.6);}',
    '.nl-pop button[type=submit][disabled]{opacity:.6;cursor:default;transform:none;box-shadow:none;}',
    ".nl-pop-note{font-family:'Poppins',system-ui,sans-serif;font-size:12px;color:#6B5F70;margin:16px 0 0;}",
    ".nl-pop-msg{font-family:'Poppins',system-ui,sans-serif;font-size:14.5px;line-height:1.6;margin:16px 0 0;display:none;}",
    '.nl-pop-msg.show{display:block;}',
    ".nl-pop-msg.ok{font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:19px;color:#4A3A55;}",
    '.nl-pop-msg.err{color:#A4514B;}',
    '.nl-pop-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;}',
    '@media (max-width:520px){.nl-pop{padding:38px 24px 30px;}.nl-pop h2{font-size:23px;}.nl-pop-logo{height:62px;}}',
    '@media (prefers-reduced-motion:reduce){.nl-pop-overlay,.nl-pop{transition:none;}}'
  ].join('');

  var HTML =
    '<div class="nl-pop" role="dialog" aria-modal="true" aria-labelledby="nlPopTitle">' +
      '<button class="nl-pop-close" type="button" aria-label="Close">&times;</button>' +
      '<img class="nl-pop-logo" src="https://res.cloudinary.com/dstssdnoj/image/upload/f_auto,q_auto,w_400/FGA/fga-logo-v3-no-bg" alt="" />' +
      '<h2 id="nlPopTitle">Guiding you on your journey from <em>grief to joy</em>.</h2>' +
      '<p class="nl-pop-sub">Simple practices and perspective shifts, free in your inbox every week.</p>' +
      '<form novalidate>' +
        '<input type="email" name="EMAIL" placeholder="your@email.com" autocomplete="email" required />' +
        '<div class="nl-pop-hp" aria-hidden="true"><input type="text" name="website" tabindex="-1" autocomplete="off" /></div>' +
        '<button type="submit">Try It</button>' +
      '</form>' +
      '<p class="nl-pop-note">Free to join. Unsubscribe anytime.</p>' +
      '<p class="nl-pop-msg" role="status" aria-live="polite"></p>' +
    '</div>';

  var overlay, lastFocus, built = false;

  function build() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    overlay = document.createElement('div');
    overlay.className = 'nl-pop-overlay';
    overlay.innerHTML = HTML;
    document.body.appendChild(overlay);

    var form = overlay.querySelector('form');
    var input = overlay.querySelector('input[type=email]');
    var hp = overlay.querySelector('input[name=website]');
    var button = overlay.querySelector('button[type=submit]');
    var note = overlay.querySelector('.nl-pop-note');
    var msg = overlay.querySelector('.nl-pop-msg');
    var label = button.textContent;

    overlay.querySelector('.nl-pop-close').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('open')) close();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        msg.textContent = 'Please enter a valid email address.';
        msg.className = 'nl-pop-msg err show';
        return;
      }

      msg.className = 'nl-pop-msg';
      button.disabled = true;
      button.textContent = 'Signing up…';

      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, website: hp.value, source: 'popup' })
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (r) {
          if (r.ok && r.data.ok) {
            form.style.display = 'none';
            note.style.display = 'none';
            msg.textContent = r.data.message || "You're in. Watch your inbox.";
            msg.className = 'nl-pop-msg ok show';
            setTimeout(close, 2600);
          } else {
            msg.textContent = r.data.error || "We couldn't sign you up just now. Please try again.";
            msg.className = 'nl-pop-msg err show';
            button.disabled = false;
            button.textContent = label;
          }
        })
        .catch(function () {
          msg.textContent = "We couldn't reach the server. Please check your connection and try again.";
          msg.className = 'nl-pop-msg err show';
          button.disabled = false;
          button.textContent = label;
        });
    });

    built = true;
  }

  function open() {
    if (seen()) return;
    if (!built) build();
    // Marked on open, so it shows exactly once whether or not they sign up.
    markSeen();
    lastFocus = document.activeElement;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    var input = overlay.querySelector('input[type=email]');
    if (input) setTimeout(function () { input.focus(); }, 350);
  }

  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onScroll() {
    var doc = document.documentElement;
    var scrollable = doc.scrollHeight - window.innerHeight;
    // Short pages can't be scrolled halfway, so treat reaching the bottom as enough.
    var progress = scrollable > 0 ? window.scrollY / scrollable : 1;
    if (progress >= SCROLL_TRIGGER) {
      window.removeEventListener('scroll', onScroll);
      open();
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
})();
