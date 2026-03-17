// Rule-based suggestions for pipeline setup (performance, security, notifications)

import type { ComponentCategory, ComponentValues } from "../types/pipeline";

export type SuggestionCategory = "performance" | "security" | "notifications";

export type SuggestionPriority = "high" | "medium" | "low";

/** One suggestion shown in the popup (with resolved categoryId for navigation) */
export interface Suggestion {
  id: string;
  title: string;
  description: string;
  steps: string;
  priority: SuggestionPriority;
  category: SuggestionCategory;
  targetCategoryId: string;
  targetComponentName: string;
}

/** Definition of a suggestion rule (targetCategorySlug resolved to id at runtime) */
interface SuggestionDefinition {
  id: string;
  title: string;
  description: string;
  steps: string;
  priority: SuggestionPriority;
  category: SuggestionCategory;
  targetCategorySlug: string;
  targetComponentName: string;
  /** Return true when this suggestion should be shown */
  shouldShow: (values: ComponentValues) => boolean;
}

const SUGGESTION_DEFINITIONS: SuggestionDefinition[] = [
  {
    id: "cache-for-node",
    title: "Enable Dependency Cache",
    description:
      "Caching dependencies speeds up every run by reusing node_modules (or similar) instead of reinstalling.",
    steps:
      "Open Left Panel → Language & Tools → Dependency Cache → turn on Enable cache.",
    priority: "high",
    category: "performance",
    targetCategorySlug: "runtime",
    targetComponentName: "Dependency Cache",
    shouldShow: (values) =>
      values["use_node"] === true && values["enable_cache"] !== true,
  },
  {
    id: "security-sast",
    title: "Add Security (SAST / audit)",
    description:
      "Run security checks (e.g. npm audit, SAST) in CI to catch vulnerabilities before they reach production.",
    steps:
      "Open Left Panel → Quality Checks → Security (SAST / audit) → turn on Run security checks.",
    priority: "high",
    category: "security",
    targetCategorySlug: "quality",
    targetComponentName: "Security (SAST / audit)",
    shouldShow: (values) => values["enable_security"] !== true,
  },
  {
    id: "slack-notification",
    title: "Slack Notification",
    description:
      "Get notified in Slack when the pipeline succeeds or fails, using an Incoming Webhook.",
    steps:
      "Open Left Panel → Notifications → Slack Notification → turn on Notify Slack on job result.",
    priority: "medium",
    category: "notifications",
    targetCategorySlug: "notifications",
    targetComponentName: "Slack Notification",
    shouldShow: (values) => values["enable_slack"] !== true,
  },
];

/**
 * Returns the list of suggestions that apply given current componentValues.
 * Resolves targetCategorySlug → targetCategoryId using categories.
 */
export function getSuggestions(
  componentValues: ComponentValues,
  categories: ComponentCategory[],
): Suggestion[] {
  const result: Suggestion[] = [];

  for (const def of SUGGESTION_DEFINITIONS) {
    if (!def.shouldShow(componentValues)) continue;

    const cat = categories.find((c) => c.slug === def.targetCategorySlug);
    if (!cat) continue;

    result.push({
      id: def.id,
      title: def.title,
      description: def.description,
      steps: def.steps,
      priority: def.priority,
      category: def.category,
      targetCategoryId: cat.id,
      targetComponentName: def.targetComponentName,
    });
  }

  return result;
}
