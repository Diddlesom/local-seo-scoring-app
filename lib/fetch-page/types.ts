export type FetchedPageData = {
  url: string;
  title: string;
  metaDescription: string;
  html: string;
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
};
