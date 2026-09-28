import type { TriageCategory } from '../triage/types.js';

export interface SeedExecution {
  status: 'passed' | 'failed' | 'skipped';
  retryCount: number;
}

export interface SeedTestDefinition {
  testName: string;
  suiteName: string;
  errorMessage?: string;
  errorSignature?: string;
  knownCategory?: Exclude<TriageCategory, 'unknown'>;
  execution: (runIndex: number, runCount: number) => SeedExecution;
}

const passed = (): SeedExecution => ({ status: 'passed', retryCount: 0 });
const failed = (): SeedExecution => ({ status: 'failed', retryCount: 0 });

export const SEED_TESTS: SeedTestDefinition[] = [
  {
    testName: 'validates payment certificate chain',
    suiteName: 'synthetic/security.spec.ts > certificate validation',
    errorMessage: 'SSL certificate expired for a synthetic payment endpoint',
    errorSignature: 'SYNTHETIC_SSL_EXPIRED',
    knownCategory: 'infrastructure_failure',
    execution: failed,
  },
  {
    testName: 'syncs customer data with CRM',
    suiteName: 'synthetic/crm.spec.ts > CRM integration',
    errorMessage: 'Synthetic CRM endpoint timed out after 30 seconds',
    errorSignature: 'SYNTHETIC_CRM_TIMEOUT',
    knownCategory: 'environment_issue',
    execution: failed,
  },
  {
    testName: 'calculates loyalty multiplier',
    suiteName: 'synthetic/loyalty.spec.ts > loyalty rules',
    errorMessage: 'Expected synthetic points 150, received 100',
    errorSignature: 'SYNTHETIC_POINTS_MISMATCH',
    knownCategory: 'product_bug',
    execution: failed,
  },
  {
    testName: 'displays new catalogue items',
    suiteName: 'synthetic/catalogue.spec.ts > new item coverage',
    errorMessage: 'Synthetic catalogue feed unavailable',
    errorSignature: 'SYNTHETIC_CATALOGUE_FEED',
    knownCategory: 'environment_issue',
    execution: (index, count) => (index === count - 1 ? failed() : passed()),
  },
  {
    testName: 'validates a new document type',
    suiteName: 'synthetic/documents.spec.ts > document validation',
    errorMessage: "Synthetic fixture missing property 'documentType'",
    errorSignature: 'SYNTHETIC_FIXTURE_PROPERTY',
    knownCategory: 'automation_bug',
    execution: (index, count) => (index === count - 1 ? failed() : passed()),
  },
  {
    testName: 'renders launch animation',
    suiteName: 'synthetic/animation.spec.ts > launch animation',
    errorMessage: 'Synthetic animation completion event timed out',
    errorSignature: 'SYNTHETIC_ANIMATION_TIMEOUT',
    knownCategory: 'flaky_test',
    execution: (index) => (index % 3 === 0 ? failed() : passed()),
  },
  {
    testName: 'syncs session state across tabs',
    suiteName: 'synthetic/session.spec.ts > cross-tab state',
    errorMessage: 'Synthetic BroadcastChannel message was not received',
    errorSignature: 'SYNTHETIC_BROADCAST_TIMEOUT',
    knownCategory: 'flaky_test',
    execution: (index) => (index % 4 === 0 ? failed() : passed()),
  },
  {
    testName: 'syncs cart after coupon applied',
    suiteName: 'synthetic/cart.spec.ts > cart polling',
    errorMessage: 'Synthetic cart total did not update',
    errorSignature: 'SYNTHETIC_CART_TIMEOUT',
    knownCategory: 'flaky_test',
    execution: (index) => {
      if (index % 11 === 0) return failed();
      return { status: 'passed', retryCount: index % 4 === 0 ? 1 : 0 };
    },
  },
  {
    testName: 'receives a push notification',
    suiteName: 'synthetic/notifications.spec.ts > push delivery',
    errorMessage: 'Synthetic push notification was not received',
    errorSignature: 'SYNTHETIC_PUSH_TIMEOUT',
    knownCategory: 'flaky_test',
    execution: (index) => {
      if (index % 13 === 0) return failed();
      return { status: 'passed', retryCount: index % 5 === 0 ? 2 : 0 };
    },
  },
  {
    testName: 'loads the home page within budget',
    suiteName: 'synthetic/performance.spec.ts > page budget',
    execution: passed,
  },
  {
    testName: 'displays the navigation menu',
    suiteName: 'synthetic/navigation.spec.ts > global navigation',
    execution: passed,
  },
  {
    testName: 'logs the user out',
    suiteName: 'synthetic/auth.spec.ts > logout',
    execution: passed,
  },
];

export const KNOWN_FLAKY = new Map(
  SEED_TESTS.map((test) => [test.testName, test.knownCategory === 'flaky_test'] as const),
);

export const KNOWN_CATEGORY = new Map(
  SEED_TESTS.flatMap((test) => (test.knownCategory ? [[test.testName, test.knownCategory] as const] : [])),
);
