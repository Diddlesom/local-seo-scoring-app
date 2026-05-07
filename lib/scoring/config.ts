export const scoringConfig = {
  maxScore: 100,
  categoryWeights: {
    content: 15,
    headings: 15,
    metadata: 20,
    localSignals: 15,
    trust: 10,
    conversion: 10,
    schema: 15
  },
  trustSignalWords: ["reviews", "no fix no fee", "warranty", "years experience"],
  ctaWords: ["call", "contact", "book", "quote", "get help"],
  schemaTypes: [
    "LocalBusiness",
    "Service",
    "FAQPage",
    "Product",
    "Review",
    "ItemList",
    "Article",
    "SoftwareApplication",
    "Organization",
    "BreadcrumbList"
  ]
} as const;
