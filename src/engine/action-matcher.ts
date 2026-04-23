/**
 * Action matcher – compiles raw action patterns and evaluates whether a
 * request action satisfies one or more compiled patterns.
 *
 * All matching is case-insensitive. No regular expressions are used.
 */

/**
 * Compiled Action pattern used for efficient matching.
 */
export type ActionPattern =
  | { readonly kind: 'any' }
  | { readonly kind: 'exact'; readonly value: string }
  | { readonly kind: 'prefix'; readonly value: string };

/**
 * Result of attempting to match a request action against a list of patterns.
 */
export interface ActionMatchResult {
  readonly matched: boolean;
  readonly matchedPattern?: ActionPattern;
  readonly reason: 'action_matched' | 'action_not_matched';
}

/**
 * Compile a raw action-pattern string into an internal {@link ActionPattern}.
 *
 * Compilation rules:
 * - `"*"` → `{ kind: 'any' }`
 * - Ends with `"*"` (e.g. `"s3:Get*"`) → `{ kind: 'prefix', value: <prefix lowercased> }`
 * - Otherwise → `{ kind: 'exact', value: <pattern lowercased> }`
 *
 * @param pattern Raw pattern string from policy input.
 * @returns Compiled pattern ready for matching.
 */
export function compileActionPattern(pattern: string): ActionPattern {
  if (pattern === '*') {
    return { kind: 'any' };
  }

  if (pattern.endsWith('*')) {
    return {
      kind: 'prefix',
      value: pattern.slice(0, -1).toLowerCase(),
    };
  }

  return {
    kind: 'exact',
    value: pattern.toLowerCase(),
  };
}

/**
 * Determine whether {@link requestAction} matches any of the supplied compiled
 * {@link patterns}.
 *
 * Matching algorithm:
 * 1. Normalise `requestAction` to lower case.
 * 2. Iterate over `patterns` in order.
 * 3. If a pattern is `any` → immediate match.
 * 4. If a pattern is `exact` → compare strings for equality.
 * 5. If a pattern is `prefix` → check whether the normalised action starts
 *    with the prefix value.
 * 6. If none match → return `action_not_matched`.
 *
 * @param requestAction Action from the evaluation request.
 * @param patterns Compiled action patterns to test against.
 * @returns Match result indicating success or failure.
 */
export function matchAction(
  requestAction: string,
  patterns: readonly ActionPattern[]
): ActionMatchResult {
  const normalisedAction = requestAction.toLowerCase();

  for (const pattern of patterns) {
    switch (pattern.kind) {
      case 'any': {
        return {
          matched: true,
          matchedPattern: pattern,
          reason: 'action_matched',
        };
      }
      case 'exact': {
        if (normalisedAction === pattern.value) {
          return {
            matched: true,
            matchedPattern: pattern,
            reason: 'action_matched',
          };
        }
        break;
      }
      case 'prefix': {
        if (normalisedAction.startsWith(pattern.value)) {
          return {
            matched: true,
            matchedPattern: pattern,
            reason: 'action_matched',
          };
        }
        break;
      }
      // No default – ActionPattern is a closed union.
    }
  }

  return {
    matched: false,
    reason: 'action_not_matched',
  };
}
