import type { ExtractedSignals, PriorityAction } from "./types";

export function createPriorityActions(signals: ExtractedSignals): PriorityAction[] {
  const actions: PriorityAction[] = [];

  if (!signals.titleKeywordMatch) {
    actions.push({
      id: "add-keyword-to-title",
      title: "Add the target keyword to the page title",
      priority: "high"
    });
  }

  if (!signals.metaDescriptionKeywordMatch) {
    actions.push({
      id: "add-keyword-to-meta-description",
      title: "Add the target keyword to the meta description",
      priority: "medium"
    });
  }

  if (!signals.metaDescriptionLocationMatch) {
    actions.push({
      id: "add-location-to-meta-description",
      title: "Add the location to the meta description",
      priority: "medium"
    });
  }

  if (signals.locationMentionCount === 0) {
    actions.push({
      id: "add-location-mentions",
      title: "Mention the target location on the page",
      priority: "high"
    });
  }

  if (!signals.hasPhoneNumber) {
    actions.push({
      id: "add-phone-number",
      title: "Add a phone number",
      priority: "high"
    });
  }

  if (signals.ctaWords.length === 0) {
    actions.push({
      id: "add-call-to-action",
      title: "Add a clear call to action",
      priority: "medium"
    });
  }

  if (signals.schemaTypes.length === 0) {
    actions.push({
      id: "add-local-schema",
      title: "Add LocalBusiness, Service, or FAQPage schema",
      priority: "medium"
    });
  }

  return actions;
}
