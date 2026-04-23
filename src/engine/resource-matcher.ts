/**
 * Compiled Resource pattern for efficient matching.
 */
export type ResourcePattern =
  | { readonly kind: 'any' }
  | { readonly kind: 'exact'; readonly value: string }
  | { readonly kind: 'wildcard'; readonly regex: RegExp };

/**
 * Result of matching a request resource against a set of Resource patterns.
 */
export interface ResourceMatchResult {
  readonly matched: boolean;
  readonly matchedPattern?: ResourcePattern;
  readonly reason: 'resource_matched' | 'resource_not_matched';
}

/**
 * Set of regex metacharacters that must be escaped when appearing
 * literally in a wildcard pattern.  '*' and '?' are excluded because
 * they are handled specially.
 */
const REGEX_META_CHARS: ReadonlySet<string> = new Set([
  '.', '+', '^', '$', '{', '}', '[', ']', '(', ')', '|', '\\', '/',
]);

/**
 * Convert a single literal character to its escaped form for use in a
 * RegExp source string.
 */
function escapeRegexChar(char: string): string {
  if (REGEX_META_CHARS.has(char)) {
    return '\\' + char;
  }
  return char;
}

/**
 * Build an anchored RegExp source string from a wildcard pattern.
 *
 * '*' → '.*'
 * '?' → '.'
 * other characters → escaped literals
 */
function buildRegexSource(pattern: string): string {
  let source = '';
  for (const char of pattern) {
    if (char === '*') {
      source += '.*';
    } else if (char === '?') {
      source += '.';
    } else {
      source += escapeRegexChar(char);
    }
  }
  return '^' + source + '$';
}

/**
 * Compile a raw Resource pattern string into an internal ResourcePattern.
 *
 * Rules:
 * - "*" → { kind: 'any' }
 * - No '*' or '?' → { kind: 'exact', value: pattern }
 * - Contains '*' or '?' → { kind: 'wildcard', regex: anchored RegExp }
 */
export function compileResourcePattern(pattern: string): ResourcePattern {
  if (pattern === '*') {
    return { kind: 'any' };
  }

  const hasWildcard = pattern.includes('*') || pattern.includes('?');
  if (!hasWildcard) {
    return { kind: 'exact', value: pattern };
  }

  const regexSource = buildRegexSource(pattern);
  return { kind: 'wildcard', regex: new RegExp(regexSource) };
}

/**
 * Determine whether `requestResource` matches any of the given compiled
 * Resource patterns.
 *
 * Algorithm:
 * 1. Iterate patterns in order.
 * 2. 'any' → immediate match.
 * 3. 'exact' → strict string equality (case-sensitive).
 * 4. 'wildcard' → RegExp.test against the request resource.
 * 5. No match → return resource_not_matched.
 */
export function matchResource(
  requestResource: string,
  patterns: readonly ResourcePattern[],
): ResourceMatchResult {
  for (const pattern of patterns) {
    switch (pattern.kind) {
      case 'any': {
        return {
          matched: true,
          matchedPattern: pattern,
          reason: 'resource_matched',
        };
      }
      case 'exact': {
        if (requestResource === pattern.value) {
          return {
            matched: true,
            matchedPattern: pattern,
            reason: 'resource_matched',
          };
        }
        break;
      }
      case 'wildcard': {
        if (pattern.regex.test(requestResource)) {
          return {
            matched: true,
            matchedPattern: pattern,
            reason: 'resource_matched',
          };
        }
        break;
      }
      default: {
        // Exhaustiveness guard; unreachable for valid ResourcePattern unions.
        const _exhaustiveCheck: never = pattern;
        throw new Error(
          `Unknown pattern kind: ${_exhaustiveCheck}`,
        );
      }
    }
  }

  return {
    matched: false,
    reason: 'resource_not_matched',
  };
}
