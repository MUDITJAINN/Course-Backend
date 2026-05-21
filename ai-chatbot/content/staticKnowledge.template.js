/**
 * TEMPLATE — copy this file into your project as `siteKnowledge.js` and edit the text.
 *
 * This block is sent to the LLM as trusted context. Include:
 * - What your site offers
 * - Navigation paths (/courses, /contact, etc.)
 * - Payment / refund / support FAQs
 * - Policies in plain language (not legal walls of text)
 */

export function getStaticKnowledgeTemplate() {
  return `
Site name: Your Brand
Site URL: https://example.com

Pages:
- / — Home
- /courses — Browse courses
- /contact — Support

FAQs:
Q: How do purchases work?
A: After payment, items appear under My Purchases.

Rules for the assistant:
- Only answer about this website.
- If unsure, direct users to /contact.
`.trim();
}
