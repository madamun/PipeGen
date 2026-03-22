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
    id: "select-language",
    title: "Select a Programming Language",
    description:
      "Choose your project's language to unlock relevant pipeline steps like testing, linting, and building.",
    steps:
      "Language & Tools → Enable Node.js, Python, Go, or Rust.",
    priority: "high",
    category: "performance",
    targetCategorySlug: "runtime",
    targetComponentName: "Node.js / JavaScript",
    shouldShow: (values) =>
      values["use_node"] !== true &&
      values["use_python"] !== true &&
      values["use_go"] !== true &&
      values["use_rust"] !== true,
  },
  {
    id: "enable-testing",
    title: "Enable Automated Testing",
    description:
      "Run tests automatically on every push to catch bugs before they reach production.",
    steps:
      "Quality Checks → Testing Strategy → turn on Run Automated Tests.",
    priority: "high",
    category: "security",
    targetCategorySlug: "quality",
    targetComponentName: "Testing Strategy",
    shouldShow: (values) => values["run_tests"] !== true,
  },
  {
    id: "enable-lint",
    title: "Enable Code Quality (Lint)",
    description:
      "Lint your code to enforce consistent style and catch common mistakes early.",
    steps:
      "Quality Checks → Code Quality (Lint) → turn on Check Code Quality.",
    priority: "medium",
    category: "security",
    targetCategorySlug: "quality",
    targetComponentName: "Code Quality (Lint)",
    shouldShow: (values) => values["check_quality"] !== true,
  },
  {
    id: "cache-for-node",
    title: "Enable Dependency Cache",
    description:
      "Caching dependencies speeds up every run by reusing node_modules instead of reinstalling.",
    steps:
      "Language & Tools → Dependency Cache → turn on Enable cache.",
    priority: "high",
    category: "performance",
    targetCategorySlug: "runtime",
    targetComponentName: "Dependency Cache",
    shouldShow: (values) =>
      values["use_node"] === true && values["enable_cache"] !== true,
  },
  {
    id: "security-sast",
    title: "Add Security Scanning",
    description:
      "Run security checks (npm audit, Trivy, or CodeQL) to catch vulnerabilities before production.",
    steps:
      "Quality Checks → Security (SAST / audit) → turn on Run security checks.",
    priority: "high",
    category: "security",
    targetCategorySlug: "quality",
    targetComponentName: "Security (SAST / audit)",
    shouldShow: (values) => values["enable_security"] !== true,
  },
  {
    id: "enable-coverage",
    title: "Upload Test Coverage",
    description:
      "Track how much of your code is tested. Upload reports to Codecov or Coveralls.",
    steps:
      "Quality Checks → Coverage report → turn on Upload coverage.",
    priority: "medium",
    category: "security",
    targetCategorySlug: "quality",
    targetComponentName: "Coverage report",
    shouldShow: (values) =>
      values["run_tests"] === true && values["enable_coverage"] !== true,
  },
  {
    id: "enable-build",
    title: "Add Build Step",
    description:
      "Build your project to verify it compiles successfully before deploying.",
    steps:
      "Build & Delivery → Build Application → turn on Build Project.",
    priority: "medium",
    category: "performance",
    targetCategorySlug: "build",
    targetComponentName: "Build Application",
    shouldShow: (values) => values["run_build"] !== true,
  },
  {
    id: "enable-docker",
    title: "Add Docker Build",
    description:
      "Containerize your app with Docker for consistent deployments across environments.",
    steps:
      "Build & Delivery → Docker Containerization → turn on Build Docker Image.",
    priority: "low",
    category: "performance",
    targetCategorySlug: "build",
    targetComponentName: "Docker Containerization",
    shouldShow: (values) => values["docker_build"] !== true,
  },
  {
    id: "enable-vercel",
    title: "Deploy to Vercel",
    description:
      "Auto-deploy your app to Vercel after tests pass. Only deploys when pipeline succeeds.",
    steps:
      "Build & Delivery → Deploy to Vercel → turn on Deploy to Vercel.",
    priority: "low",
    category: "performance",
    targetCategorySlug: "build",
    targetComponentName: "Deploy to Vercel",
    shouldShow: (values) => values["deploy_vercel"] !== true,
  },
  {
    id: "slack-notification",
    title: "Slack Notification",
    description:
      "Get notified in Slack when the pipeline succeeds or fails.",
    steps:
      "Notifications → Slack Notification → turn on Notify Slack.",
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
  dismissed?: Set<string>,
): Suggestion[] {
  const result: Suggestion[] = [];

  for (const def of SUGGESTION_DEFINITIONS) {
    if (!def.shouldShow(componentValues)) continue;
    if (dismissed?.has(def.id)) continue;

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
