import assert from "node:assert/strict";

const origin = (process.argv[2] || "http://127.0.0.1:3100").replace(/\/$/, "");
const canonicalOrigin = "https://www.worksapp.co";
const paths = ["/", "/pricing", "/contractor-invoicing-software", "/contractor-job-management-software", "/privacy-policy"];
const titles = new Set();

for (const path of paths) {
  const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, `${path}: HTTP status`);
  const html = await response.text();
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  assert.ok(title && !titles.has(title), `${path}: unique title`);
  titles.add(title);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  assert.ok(canonical, `${path}: canonical present`);
  assert.equal(new URL(canonical).href, new URL(path, canonicalOrigin).href, `${path}: canonical`);
  assert.match(html, /<meta name="description" content="[^"]+"/, `${path}: description`);
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${path}: one H1 in server HTML`);
  assert.ok(!html.match(/<meta name="robots" content="[^"]*noindex/), `${path}: indexable`);
  if (path !== "/privacy-policy") {
    assert.ok(html.includes('href="/auth/signup"'), `${path}: signup link`);
    assert.ok(html.includes("Free") || html.includes("free"), `${path}: free plan visible`);
  }
  if (path === "/") {
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
    assert.ok(blocks.some(block => block["@graph"]?.some(entity => entity["@type"] === "SoftwareApplication" && entity.offers?.price === "0")), "Homepage: free software structured data");
  }
  console.log(`PASS ${path}: metadata, server HTML, heading, indexability`);
}

const sitemapResponse = await fetch(`${origin}/sitemap.xml`);
assert.equal(sitemapResponse.status, 200);
const sitemap = await sitemapResponse.text();
for (const path of paths) assert.ok(sitemap.includes(`<loc>${canonicalOrigin}${path}</loc>`));
assert.equal((sitemap.match(/<loc>/g) || []).length, paths.length, "Sitemap: only public pages");
const robotsResponse = await fetch(`${origin}/robots.txt`);
assert.equal(robotsResponse.status, 200);
const robots = await robotsResponse.text();
assert.ok(robots.includes("Allow: /"));
assert.ok(robots.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`));
assert.ok(robots.includes("Disallow: /invoice/"));
assert.ok(robots.includes("Disallow: /proposal/"));
console.log("PASS sitemap and robots");

for (const path of ["/auth/login", "/admin/login", "/dashboard", "/invoice/seo-check-invalid-token", "/proposal/seo-check-invalid-token", "/api/profile"]) {
  const response = await fetch(`${origin}${path}`, { redirect: "manual", signal: AbortSignal.timeout(20000) });
  assert.ok(response.headers.get("x-robots-tag")?.includes("noindex"), `${path}: noindex header (HTTP ${response.status})`);
  console.log(`PASS ${path}: noindex response header`);
}
