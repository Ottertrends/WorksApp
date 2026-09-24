# WorksApp search and AI discovery research

Reviewed September 24, 2026. Audience confirmed by the owner: contractor businesses with 1–10 people, led by an owner on job sites, sometimes supported by one or two managers. Analytics and advertising are deferred.

## Positioning

Contractor software with a free plan, bringing invoices, clients, jobs, and a WhatsApp AI assistant into one workspace. Lead with the job the buyer needs to do and make the free allowance concrete. Explain WhatsApp as the way to use the product from the field.

Free means 3 projects, 5 clients, 60 AI messages/month, and unlimited basic invoices. Signup does not require a card. The basic tier has no trial expiry in the current access logic. Shared access requires Premium Team; invoice branding, PDFs, payment links, and calendar reminders require Premium. Sources: `src/lib/billing/access.ts`, existing pricing page, and signup flow. Recheck copy whenever plans change.

## What the research does and does not establish

This is qualitative keyword and search-intent research from public search results and contractor discussions. It is not a keyword-volume, CPC, ranking-difficulty, or conversion study. No Search Console, Keyword Planner, or paid keyword dataset was available. Search results vary by location and personalization. Treat the phrases below as targets to validate after indexing.

Original forum questions carry more weight here than product recommendations in replies. Many recent results and replies are vendor promotions. They are useful for understanding competing messaging, not independent proof that a product is good or a claim is true. No forum outreach or posting was performed.

## Contractor language and needs

| Evidence | Observed need | Applied to WorksApp |
| --- | --- | --- |
| [Small construction company tools, October 2024](https://www.reddit.com/r/Contractor/comments/1ftesya/what_project_management_tools_for_a_small/) | A residential builder with 9 employees and one project manager wants to move beyond paper and Word without overspending. | Explicit small-team positioning, a free first-job evaluation, and a job-management page. |
| [Estimating and invoicing discussion, March 2023, with later follow-ups](https://www.reddit.com/r/Contractor/comments/11oxviv/estimating_and_invoicing_software_what_are_you/) | A solo contractor with occasional help describes detailed invoicing needs and frustration with feature limits. | Clear workflow and plan boundaries. Do not claim estimate version history, selective markup, or other unverified capabilities. |
| [Eight-person crew seeking management software, January 2026](https://www.reddit.com/r/Construction/comments/1q78j0d/whats_the_best_contractor_management_software_for/) | The original question asks how to keep paperwork, invoices, and schedules organized for a small crew. | Lead with invoices, jobs, and clients; explain owner/manager shared access as a paid feature. Low-engagement thread: directional evidence only. |
| [Free invoicing discussion, June 2026](https://www.reddit.com/r/Invoice/comments/1ugrsu0/whats_the_best_free_invoicing_software/) | A buyer asks about free functionality and limitations. | Put free limits and paid exclusions alongside the signup offer. This is a broader small-business audience, not contractor-only evidence. |

Searches for “free contractor invoicing software” and “small contractor job management software free plan” also returned vendor landing pages promoting free access, mobile use, and simple job administration. Examples inspected: [Contractor Ace invoicing](https://contractorace.app/invoicing-software), [Fixallo](https://fixallo.com/en-us), and [Jobsite Journal](https://www.jobsitejournal.com/). These show the competitive messaging environment; their claims have not been independently verified. WorksApp should distinguish its actual free limits and WhatsApp workflow, not claim to be the only free option.

## Keyword-to-page map

Priority reflects product fit and buyer intent, not measured search volume.

| Priority | Query family | Page | Answer / action |
| --- | --- | --- | --- |
| 1 | contractor software for small teams; small contractor software; contractor software free plan | `/` | Define the audience and product; show the free allowance and signup path. |
| 1 | free contractor invoicing software; contractor invoice app; invoicing software for small contractors | `/contractor-invoicing-software` | Explain basic invoices, draft review, WhatsApp use, and exactly which features require Premium. |
| 1 | job management software for small contractors; small construction crew software; organize contractor jobs | `/contractor-job-management-software` | Show client/project/schedule workflow and how to evaluate it with one real job. |
| 1 | WorksApp pricing; WorksApp free plan; contractor software pricing | `/pricing` | Compare the actual limits, monthly/annual options, and team seats. |
| 2 | invoice from WhatsApp; WhatsApp assistant for contractors | Homepage and invoicing page | Product differentiator; demand has not been measured. Avoid a near-duplicate landing page. |
| Later | roofing invoice app; remodeling job management; plumbing invoicing software | No separate pages yet | Only add pages when there is substantial trade-specific workflow content and product evidence. |

Do not target construction takeoff, payroll, GPS dispatch, full accounting, or enterprise construction management as supported product capabilities without a separate product verification. Do not publish “best” comparisons or customer success statistics without evidence.

## On-site changes

- Unique titles, descriptions, canonical URLs, social metadata, and a clear page topic.
- Canonical host `https://www.worksapp.co`, verified against the existing apex-to-www 308 redirect.
- XML sitemap containing only public marketing pages, and robots rules allowing public crawling.
- Organization/SoftwareApplication data on the homepage, reflecting the visible free offer; breadcrumb data on feature pages. No invented ratings or testimonials.
- Publicly rendered answers about product fit, free limits, team access, and payment requirements.
- Links connecting the homepage, pricing, and the two feature pages.
- Noindex metadata and response headers for account, dashboard, administration, customer invoice, and proposal routes; API responses also receive noindex headers. Robots is not access control and cannot guarantee removal of previously indexed URLs.
- Public feature/pricing/crawler endpoints bypass an unnecessary authentication refresh.

Google says ordinary SEO remains foundational for its AI features: useful content, crawling, indexing, and clear structure. It does not guarantee inclusion. See [Google’s AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) and [Search Essentials](https://developers.google.com/search/docs/essentials). No special AI-only text files or hidden keyword content were added. The general robots rule permits compliant search and AI crawlers on public pages; CDN/WAF policies must also allow them in production.

## After publication

1. Verify deployed HTML and redirects, `/robots.txt`, and `/sitemap.xml`; run the local SEO verification script against production.
2. Submit the sitemap and inspect key URLs in Google Search Console and Bing Webmaster Tools when account access is available. This is pending and does not require adding analytics tags.
3. Check impressions and actual queries after indexing, then revise the keyword map based on evidence. Do not judge SEO from a single personalized search.
4. Add an actual product walkthrough and permissioned customer examples when available. A demonstration should clearly separate examples from customer evidence.
5. Revisit analytics and PPC only in the later phase requested by the owner.

Deployment and search-console submission are not included in the completed local implementation.

## Local verification

Production build (including TypeScript) and ESLint on changed source files passed. `node scripts/verify-seo.mjs` passed against the local production server: all five public pages, the sitemap/robots endpoints, valid homepage JSON-LD, and noindex headers on representative private routes. Desktop homepage and mobile homepage/invoicing layouts were visually inspected; mobile widths showed no horizontal overflow. The pricing toggle retained annual prices and annual signup links. These checks establish implementation behavior, not rankings or live indexing.
