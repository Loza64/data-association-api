export const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const containsRegex = (search: string): RegExp => new RegExp(escapeRegex(search), 'i');
