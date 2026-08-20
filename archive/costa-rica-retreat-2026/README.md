# Costa Rica retreat, taken down 2026-08-19

Becky may run this again, so the four pages are parked here intact rather than
deleted. Nothing in this folder is deployed: `.vercelignore` excludes `archive/`.

## What was here

| File | Lived at |
| --- | --- |
| `costa-rica-retreat.html` | `/costa-rica-retreat` |
| `bodhi-tree-casita.html` | `/bodhi-tree-casita` |
| `retreat-jungle-room.html` | `/retreat-jungle-room` |
| `retreat-queen-bungalow.html` | `/retreat-queen-bungalow` |

The three room pages each sell one room and link out to a Stripe hosted
checkout. **Check those Stripe links before relaunching**, since prices and
payment links go stale:

- Casita: `https://buy.stripe.com/28EbJ085IaRv5IEeMM87K05`
- Queen bungalow: `https://buy.stripe.com/cNi00ibhU9Nr0ok34487K02`
- Jungle room: see the link in `retreat-jungle-room.html`

The casita and jungle room pages also embed a YouTube room tour.

## What was removed elsewhere

Taking it down touched only links, never content. Each of the 9 remaining pages
lost exactly three:

1. `<a href="costa-rica-retreat">Retreat</a>` in the desktop nav
2. `<a href="costa-rica-retreat">Costa Rica Retreat</a>` in the mobile menu
3. `<a href="costa-rica-retreat">Costa Rica Retreat</a>` in the footer Explore column

Also: the four `sitemap.xml` entries were deleted, and `vercel.json` gained four
**temporary (307)** redirects sending the old URLs to the homepage, so links in
old emails and social posts don't dead-end. They're temporary on purpose, so
Google doesn't treat the retreat URLs as permanently replaced by the homepage.

## To put it back

1. `git mv archive/costa-rica-retreat-2026/*.html .` (leave this README behind)
2. Delete the four `redirects` entries from `vercel.json`
3. Restore the three links per page, in the same three places listed above.
   `git show 8755148 -- about.html` shows what they looked like, or copy the
   pattern from any current nav or footer block
4. Re-add the four URLs to `sitemap.xml` with a fresh `lastmod`
5. Verify the Stripe links and the dates and prices on all four pages

The nav sat as: About, Episodes, Newsletter, Breathwork, **Retreat**, Contact.
