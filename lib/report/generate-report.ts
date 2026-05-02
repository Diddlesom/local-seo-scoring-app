import type { PrioritizedAction, ScoreResult } from "../scoring/types";

export type ReportPageDetails = {
  keyword: string;
  location: string;
  url: string;
  title: string;
  metaDescription: string;
};

type GenerateReportInput = {
  page: ReportPageDetails;
  result: ScoreResult;
};

const priorityLabels: Record<PrioritizedAction["priority"], string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority"
};

function getLocation(page: ReportPageDetails): string {
  return page.location || "[target location]";
}

function listItems(items: string[]): string {
  if (items.length === 0) {
    return "- None found";
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function getDoNotChangeItems(result: ScoreResult): string[] {
  const items: string[] = [];

  if (
    result.strengths.some((strength) => strength.toLowerCase().includes("title"))
  ) {
    items.push("Page title already contains useful target keyword relevance.");
  }

  if (result.signals.headings.h1.length > 0) {
    items.push(`H1 is already present: ${result.signals.headings.h1[0]}`);
  }

  if (result.signals.headings.h2.length > 0) {
    items.push(
      "Existing service sections/headings are useful. Improve them rather than replacing them."
    );
  }

  if (result.signals.hasPhoneNumber || result.signals.ctaWords.length > 0) {
    items.push(
      "Phone number and/or call-to-action placement is already detected."
    );
  }

  if (result.signals.trustSignals.length > 0) {
    items.push(
      `Existing review/trust content is useful: ${result.signals.trustSignals.join(", ")}.`
    );
  }

  if (items.length === 0) {
    items.push(
      "Keep any accurate business details, service copy, phone numbers, and existing trust content that are already on the page."
    );
  }

  return items;
}

function getTaskDetails(
  action: PrioritizedAction,
  page: ReportPageDetails
): {
  whereToImplement: string;
  whatToChange: string;
  example: string;
  expectedOutcome: string;
} {
  const cleanAction = action.action.toLowerCase();
  const location = getLocation(page);

  if (cleanAction.includes("faqpage schema")) {
    return {
      whereToImplement:
        "WordPress SEO plugin custom schema field, theme page head, or page-level JSON-LD injection area.",
      whatToChange:
        "Add JSON-LD FAQPage schema that matches the FAQ content already visible on the page.",
      example: `Example JSON-LD:
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Do you offer ${page.keyword || "this service"} in ${location}?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, we help customers in ${location} with ${page.keyword || "this service"}. Contact us for advice and availability."
      }
    }
  ]
}
</script>`,
      expectedOutcome:
        "Search engines can understand the visible FAQ content as structured question-and-answer information."
    };
  }

  if (cleanAction.includes("internal links")) {
    return {
      whereToImplement:
        "Inside relevant service sections in the main page content.",
      whatToChange:
        "Add contextual links to related service pages using natural anchor text.",
      example:
        "Example anchors to use where relevant: laptop repair, Mac repair, data recovery, virus removal.",
      expectedOutcome:
        "Visitors and search engines can move more easily between related service pages."
    };
  }

  if (cleanAction.includes("areaServed".toLowerCase())) {
    return {
      whereToImplement:
        "Inside the LocalBusiness JSON-LD schema block.",
      whatToChange:
        "Add areaServed using the target town and nearby service area.",
      example: `Example areaServed:
"areaServed": [
  "${location}",
  "nearby towns and villages"
]`,
      expectedOutcome:
        "The LocalBusiness schema clearly states the local area the business serves."
    };
  }

  if (
    cleanAction.includes("schema blocks") ||
    cleanAction.includes("consolidate")
  ) {
    return {
      whereToImplement:
        "Existing JSON-LD schema output in the SEO plugin, theme, or page template.",
      whatToChange:
        "Keep one consistent LocalBusiness block. Check name, URL, phone, address, opening hours, and areaServed.",
      example:
        "Remove duplicate/conflicting LocalBusiness blocks and keep the most complete version.",
      expectedOutcome:
        "Structured data is clearer, easier to validate, and less likely to contain conflicting business details."
    };
  }

  if (cleanAction.includes("openinghours")) {
    return {
      whereToImplement:
        "Inside the LocalBusiness JSON-LD schema block.",
      whatToChange:
        "Add openingHoursSpecification with the correct opening days and times.",
      example: `Example openingHoursSpecification:
"openingHoursSpecification": [
  {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "opens": "09:00",
    "closes": "17:30"
  }
]`,
      expectedOutcome:
        "The LocalBusiness schema gives clearer business availability information."
    };
  }

  if (
    cleanAction.includes("case study") ||
    cleanAction.includes("example job")
  ) {
    return {
      whereToImplement:
        "Add a short section in the main content, near service details or trust content.",
      whatToChange:
        "Add one recent, location-specific job example.",
      example: `Copy template:
Recent ${location} repair example: A customer in [area] had [problem]. We [fix]. The device was returned in [timeframe].`,
      expectedOutcome:
        "The page gains unique local proof and more specific service detail."
    };
  }

  if (cleanAction.includes("meta wording")) {
    return {
      whereToImplement:
        "SEO title/meta plugin field or page metadata settings.",
      whatToChange:
        "Rewrite the meta description to include the service, location, benefit, and call to action.",
      example: `Example meta description:
Need ${page.keyword || "local service help"} in ${location}? Get clear advice, fast support, and trusted local service. Contact us today for a quote.`,
      expectedOutcome:
        "The search result snippet becomes clearer and more likely to earn clicks."
    };
  }

  return {
    whereToImplement:
      "Relevant page content, SEO plugin, schema settings, or page template.",
    whatToChange: action.action,
    example:
      "Use the existing page style and add the smallest clear change needed to complete this task.",
    expectedOutcome: action.whyItMatters
  };
}

function formatTasks(
  actions: PrioritizedAction[],
  priority: PrioritizedAction["priority"],
  page: ReportPageDetails
): string {
  const filteredActions = actions.filter(
    (action) => action.priority === priority
  );

  if (filteredActions.length === 0) {
    return `${priorityLabels[priority]}\n\nNo tasks in this group.`;
  }

  return [
    priorityLabels[priority],
    ...filteredActions.map((action, index) => {
      const details = getTaskDetails(action, page);

      return [
        `Task ${index + 1}`,
        "",
        "Task:",
        action.action,
        "",
        "Where to implement:",
        details.whereToImplement,
        "",
        "What to change:",
        details.whatToChange,
        "",
        "Example code or copy:",
        details.example,
        "",
        "Expected outcome:",
        details.expectedOutcome,
        "",
        "Estimated score gain:",
        `+${action.estimatedScoreGain}`
      ].join("\n");
    })
  ].join("\n\n");
}

export function generateDeveloperReport({
  page,
  result
}: GenerateReportInput): string {
  return [
    "LOCAL SEO DEVELOPER TASK SHEET",
    "",
    "PAGE DETAILS",
    `- Target keyword: ${page.keyword || "Not provided"}`,
    `- Location: ${page.location || "Not provided"}`,
    `- URL: ${page.url || "Not provided"}`,
    `- Score / grade: ${result.totalScore}/100 (${result.grade})`,
    "",
    "DO NOT CHANGE",
    listItems(getDoNotChangeItems(result)),
    "",
    "TASKS FOR DEVELOPER",
    formatTasks(result.prioritizedActions, "high", page),
    "",
    formatTasks(result.prioritizedActions, "medium", page),
    "",
    formatTasks(result.prioritizedActions, "low", page),
    "",
    "DEVELOPER QA CHECKLIST",
    "- Run Google Rich Results Test",
    "- Validate JSON-LD",
    "- Check page still has one H1",
    "- Check phone links still work",
    "- Check page loads correctly on mobile",
    "- Check no duplicate/conflicting LocalBusiness schema remains"
  ].join("\n");
}
