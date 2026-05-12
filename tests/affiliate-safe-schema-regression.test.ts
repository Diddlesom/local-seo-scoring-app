import assert from "node:assert/strict";
import { scoreLocalSeo } from "../lib/scoring/scoring-engine";

const longComparisonCopy = Array.from({ length: 55 }, () =>
  [
    "The MOZA R3 and Logitech G923 are compared for buyers choosing a sim racing wheel.",
    "The comparison table covers force feedback, console compatibility, pedals, setup, and value.",
    "Pros and cons are listed for each wheel with best for labels and buyer guide advice.",
    "Price and value guidance is included without inventing offers, ratings, reviews, or availability."
  ].join(" ")
).join(" ");

const html = `<article>
  <header>
    <h1>MOZA R3 VS LOGITECH G923</h1>
    <p>Affiliate Disclosure: This page may contain affiliate links. If you buy through these links, we may earn a commission at no extra cost to you. As an Amazon Associate, RaceRigHQ earns from qualifying purchases.</p>
    <p>Written by Dave, RaceRigHQ reviewer. Updated May 2026 after hands-on comparison testing.</p>
  </header>
  <h2>Comparison table</h2>
  <table><tr><th>Wheel</th><th>Best for</th><th>Value</th></tr><tr><td>MOZA R3</td><td>Direct drive beginners</td><td>Strong bundle value</td></tr><tr><td>Logitech G923</td><td>Budget console buyers</td><td>Often cheaper</td></tr></table>
  <h2>Pros and cons</h2>
  <p>MOZA R3 pros include direct drive feel. Logitech G923 pros include wide availability. Each option has trade-offs.</p>
  <h2>Buyer guide</h2>
  <p>Choose based on platform, budget, force feedback, pedals, setup, and upgrade plans.</p>
  <h2>FAQs</h2>
  <h3>Is the MOZA R3 better than the Logitech G923?</h3>
  <p>It depends on platform and budget.</p>
  <h3>Which wheel is best for beginners?</h3>
  <p>The G923 can be easier to buy, while the R3 has stronger direct drive feel.</p>
  <a href="/best-sim-racing-wheels/">Related comparison guide</a>
  <p>${longComparisonCopy}</p>
</article>`;

const schemaJson = `{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "MOZA R3" },
    { "@type": "ListItem", "position": 2, "name": "Logitech G923" }
  ]
}
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is the MOZA R3 better than the Logitech G923?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "It depends on platform and budget."
      }
    }
  ]
}`;

const result = scoreLocalSeo({
  html,
  intentMode: "affiliate",
  keyword: "moza r3 vs logitech g923",
  metaDescription:
    "MOZA R3 vs Logitech G923 comparison for sim racing buyers.",
  relatedInternalLinks: [
    { text: "Best sim racing wheels", url: "/best-sim-racing-wheels/" }
  ],
  schemaJson,
  text: html,
  title: "MOZA R3 VS LOGITECH G923"
});

assert.equal(result.grade, "A");
assert.equal(result.signals.schemaTypes.includes("ItemList"), true);
assert.equal(result.signals.schemaTypes.includes("FAQPage"), true);
assert.equal(result.signals.schemaTypes.includes("Product"), false);
assert.equal(result.signals.affiliateChecks?.cleanComparisonSchemaPresent, true);
assert.equal(
  result.prioritizedActions.some(
    (action) =>
      action.priority === "high" || action.priority === "medium"
  ),
  false
);
assert.equal(
  result.prioritizedActions.some((action) =>
    /add product|add .*review schema/i.test(action.action)
  ),
  false
);
assert.equal(
  result.prioritizedActions.some((action) =>
    /schema appears suitable for a comparison article/i.test(action.action)
  ),
  true
);
