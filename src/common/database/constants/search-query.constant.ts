export const SEARCH_REGEX_ESCAPE = {
    PATTERN: /[.*+?^${}()|[\]\\]/g,
    REPLACEMENT: '\\$&',
} as const;

export const SEARCH_REGEX_CASE_INSENSITIVE_FLAG = 'i';
