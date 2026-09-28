/**
 * Endpoint scope classification.
 *
 * Kept separate from provider selection on purpose: whether evidence leaves this
 * machine is a property of the resolved URL, never of the engine's name. A
 * self-hostable engine pointed at a hosted endpoint is egress exactly like a
 * SaaS engine, and a SaaS-shaped engine on loopback is not.
 */

export type EndpointScope = 'local' | 'remote';

const PRIVATE_IPV4 = /^(?:10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/;
const LOCAL_SUFFIXES = ['.localhost', '.local', '.internal'] as const;

/**
 * Treats loopback, private ranges, and single-label hostnames as local. A
 * single-label host is how a container reaches a sibling service on the Compose
 * network (`http://engine:8000`), which never leaves the host. An unparseable
 * endpoint is treated as remote so a malformed value fails closed.
 */
export function classifyEndpointScope(endpoint: string): EndpointScope {
  let host: string;
  try {
    host = new URL(endpoint).hostname.toLowerCase();
  } catch {
    return 'remote';
  }
  const bare = host.replace(/^\[|\]$/g, '');
  if (bare === 'localhost' || bare === '::1' || bare === '0.0.0.0') return 'local';
  if (LOCAL_SUFFIXES.some((suffix) => bare.endsWith(suffix))) return 'local';
  if (PRIVATE_IPV4.test(bare)) return 'local';
  if (!bare.includes('.') && !bare.includes(':')) return 'local';
  return 'remote';
}
