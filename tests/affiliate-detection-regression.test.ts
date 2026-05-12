import assert from "node:assert/strict";
import { scoreLocalSeo } from "../lib/scoring/scoring-engine";

const sampleHtml = `<article>
  <header>
    <p>RACERIGHQ DIRECT DRIVE COMPARISON</p>
    <h1>MOZA R3 VS LOGITECH G923</h1>
    <p>Affiliate Disclosure: This page may contain affiliate links. If you buy through these links, we may earn a commission at no extra cost to you. As an Amazon Associate, RaceRigHQ earns from qualifying purchases.</p>
  </header>
</article>`;

const result = scoreLocalSeo({
  html: sampleHtml,
  intentMode: "affiliate",
  keyword: "moza r3 vs logitech g923",
  text: sampleHtml,
  title: "MOZA R3 VS LOGITECH G923"
});

assert.equal(result.signals.headings.h1.length > 0, true);
assert.equal(result.signals.headings.h1.length, 1);
assert.equal(result.signals.headings.h1[0], "MOZA R3 VS LOGITECH G923");
assert.equal(
  result.signals.affiliateChecks?.visibleAffiliateDisclosurePresent,
  true
);
assert.equal(result.signals.affiliateChecks?.amazonAssociateWordingPresent, true);
assert.equal(
  result.weaknesses.includes("No H1 heading was found."),
  false
);
assert.equal(
  result.weaknesses.includes("No visible affiliate disclosure was found."),
  false
);
