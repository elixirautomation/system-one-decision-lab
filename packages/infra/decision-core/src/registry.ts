/** Generic provider registry with no built-in implementations or default choice. */
import type { DecisionProviderDefinition } from './contract.js';

export type DecisionProviderId = string;

export class UnknownProviderError extends Error {
  constructor(
    readonly received: string | undefined,
    accepted: readonly string[],
  ) {
    const rendered = received?.trim() ? `"${received}"` : 'no provider';
    super(`DECISION_PROVIDER must be one of ${accepted.join(', ')}; received ${rendered}.`);
    this.name = 'UnknownProviderError';
  }
}

export class DuplicateProviderError extends Error {
  constructor(readonly key: string) {
    super(`Provider id or alias is already registered: ${key}`);
    this.name = 'DuplicateProviderError';
  }
}

export class DecisionProviderRegistry {
  private readonly byKey = new Map<string, DecisionProviderDefinition>();

  constructor(definitions: readonly DecisionProviderDefinition[] = []) {
    for (const definition of definitions) this.register(definition);
  }

  register(definition: DecisionProviderDefinition): this {
    const keys = [definition.id, ...(definition.aliases ?? [])].map((key) => key.trim().toLowerCase());
    for (const key of keys) {
      if (!key) throw new Error('Provider ids and aliases must not be blank.');
      if (this.byKey.has(key)) throw new DuplicateProviderError(key);
    }
    for (const key of keys) this.byKey.set(key, definition);
    return this;
  }

  list(): DecisionProviderDefinition[] {
    return [...new Set(this.byKey.values())];
  }

  ids(): string[] {
    return this.list().map((definition) => definition.id);
  }

  find(name: string | undefined): DecisionProviderDefinition | undefined {
    const key = name?.trim().toLowerCase();
    return key ? this.byKey.get(key) : undefined;
  }

  require(name: string | undefined): DecisionProviderDefinition {
    const definition = this.find(name);
    if (!definition) throw new UnknownProviderError(name, this.ids());
    return definition;
  }
}
