export type FetchedPageData = {
  url: string;
  title: string;
  metaDescription: string;
  html: string;
  cleanText: string;
  bodyText: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  schemaJson: string;
  phoneNumbers: string[];
  telLinks: string[];
  addressLikeText: string[];
  faqQuestions: string[];
  faqItems: Array<{
    question: string;
    answer: string;
  }>;
  relatedInternalLinks: Array<{
    text: string;
    url: string;
  }>;
  fetchStatus?: "success" | "limited";
  fetchReason?: string;
  fetchSource?: "direct" | "jina";
};
