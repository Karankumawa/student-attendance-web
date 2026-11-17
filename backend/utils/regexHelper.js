/**
 * Safely escape characters that have special meaning in regular expressions.
 * Prevents regex injection and regex syntax errors when user inputs characters like (, ), [, ], +, *, ?, etc.
 */
const escapeRegex = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports = {
  escapeRegex,
};
