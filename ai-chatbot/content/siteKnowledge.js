/**
 * Project-specific knowledge for Programming With Mudit.
 * When reusing the chatbot module, replace this file in your host app.
 */

export function getSiteKnowledge() {
  return `
Site: Programming With Mudit (programmingwithmudit.com / programmingwithmudit.in)
Focus: MERN stack courses, downloadable notes, mock interviews, freelance dev services.

Main pages:
- / — Home, featured courses and notes
- /courses — All video courses (purchase with PhonePe)
- /notes — PDF notes marketplace (preview, then purchase)
- /purchases — Logged-in user's bought courses and notes
- /services — Hire for freelance MERN/React work (Telegram, WhatsApp, contact form)
- /about — Vision, mission, rules, FAQs
- /contact — Email support (jainmuditt@gmail.com)
- /mock-interviews — Mock interview practice offering
- /tips — Coding and interview tips
- /coding-hacks — Short React/JS/MERN hacks
- /blog — Articles (MERN roadmap, React projects, hiring guide)
- /terms — Terms & Conditions
- /privacy — Privacy Policy
- /refund — Refund & Cancellation policy
- /login, /signup — User accounts (JWT cookies)
- /settings — Profile preferences
- /favorites/courses, /favorites/notes — Saved items

How purchases work:
- User signs up / logs in.
- Pays via PhonePe on course or note checkout.
- Server verifies payment; access is tied to the purchasing account only.
- Purchased items show under My Purchases; notes can be downloaded from Notes page.

Notes specifics:
- Free preview of first pages may be available before purchase.
- Full PDF download only after verified payment.
- Do not share paid materials publicly.

Courses:
- Structured video courses with title, description, and price shown on listing pages.

Services:
- Freelance web development: bug fixes, new features, MERN apps, API integrations.
- Contact via Services page (form, Telegram, WhatsApp).

Support:
- For payment or access issues, use Contact with account email and screenshots.
- Refund questions: refer to /refund policy page.

Content topics the site teaches:
- MERN stack, React, Node/Express, MongoDB, JWT auth, payments, deployment, interview prep.

Assistant behavior:
- Be helpful and concise.
- If asked about something not listed here or in the live catalog, say you are not sure and suggest /contact or /services.
`.trim();
}
