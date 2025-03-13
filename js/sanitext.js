/**
 * SaniText - JavaScript implementation of text sanitization
 * Ported from the Python implementation
 */

/**
 * Build and return the set of allowed characters based on:
 * - default ASCII printable
 * - user-specified flag to allow single code point emojis
 * - user-specified chars
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.allowEmoji - Whether to allow emoji characters
 * @param {string} options.allowChars - Additional characters to allow
 * @returns {Set} - Set of allowed characters
 */
function getAllowedCharacters(options = {}) {
    const { allowEmoji = false, allowChars = '' } = options;
    
    // Create a set with ASCII printable characters (32-126)
    const allowed = new Set();
    for (let i = 32; i <= 126; i++) {
        allowed.add(String.fromCharCode(i));
    }
    
    // Add newline, tab, etc.
    allowed.add('\n');
    allowed.add('\t');
    allowed.add('\r');
    
    // If emoji are allowed, add them
    if (allowEmoji) {
        EMOJI_SET.forEach(emoji => allowed.add(emoji));
    }
    
    // Add user-specified characters
    if (allowChars) {
        [...allowChars].forEach(char => allowed.add(char));
    }
    
    return allowed;
}

/**
 * Finds characters in the text that are not in the allowed set
 * 
 * @param {string} text - The input text to check
 * @param {Set} allowedCharacters - Set of allowed characters
 * @returns {Array} - Array of objects with character and its Unicode info
 */
function detectSuspiciousCharacters(text, allowedCharacters = getAllowedCharacters()) {
    const suspicious = [];
    
    for (const char of text) {
        if (!allowedCharacters.has(char)) {
            suspicious.push({
                char,
                codePoint: char.codePointAt(0),
                hexCode: `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
                name: getUnicodeName(char)
            });
        }
    }
    
    return suspicious;
}

/**
 * Get the Unicode name for a character (simplified implementation)
 * 
 * @param {string} char - The character to get the name for
 * @returns {string} - The Unicode name or "Unknown"
 */
function getUnicodeName(char) {
    // This is a simplified implementation
    // In a production environment, you would use a proper Unicode database
    try {
        // Some browsers support this
        if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
            const namer = new Intl.DisplayNames(['en'], { type: 'codepoint' });
            return namer.of(char);
        }
    } catch (e) {
        // Fallback if Intl.DisplayNames is not available or fails
    }
    
    return `Character at code point ${char.codePointAt(0)}`;
}

/**
 * Returns the closest ASCII character for a given Unicode character
 * 
 * @param {string} char - The character to find a replacement for
 * @param {Set} allowedCharacters - Set of allowed characters
 * @returns {string} - The replacement string or empty string if no good match
 */
function closestAscii(char, allowedCharacters) {
    // Try homoglyph replacement first
    const mapped = getHomoglyphReplacement(char);
    if (allowedCharacters.has(mapped)) {
        return mapped; // Direct replacement
    }
    
    // Try Unicode normalization (NFKC)
    // This is similar to Python's unicodedata.normalize("NFKC", char)
    try {
        const normalized = char.normalize('NFKC');
        if ([...normalized].every(c => allowedCharacters.has(c))) {
            return normalized; // Safe replacement
        }
    } catch (e) {
        // Normalization not supported or failed
    }
    
    // If no good match, return empty string
    return '';
}

/**
 * Remove or replace characters not in the allowed set
 * 
 * @param {string} text - The text to sanitize
 * @param {Object} options - Configuration options
 * @param {Set} options.allowedCharacters - Set of allowed characters
 * @param {boolean} options.interactive - Whether to use interactive mode
 * @param {Function} options.onCharacterDecision - Callback for interactive mode
 * @returns {Promise<string>} - The sanitized text
 */
async function sanitizeText(text, options = {}) {
    const { 
        allowedCharacters = getAllowedCharacters(),
        interactive = false,
        onCharacterDecision = null
    } = options;
    
    // Identify disallowed characters
    const disallowedChars = [...new Set([...text].filter(ch => !allowedCharacters.has(ch)))].sort();
    
    if (disallowedChars.length === 0) {
        // If nothing disallowed, just return original text
        return text;
    }
    
    // Character decisions map
    const charDecisions = {};
    
    // If interactive is enabled, ask the user for each unique disallowed char
    if (interactive && typeof onCharacterDecision === 'function') {
        for (const ch of disallowedChars) {
            // Decision for this character already been taken
            if (ch in charDecisions) {
                continue;
            }
            
            // Provide some info about the character
            const charInfo = {
                char: ch,
                codePoint: ch.codePointAt(0),
                hexCode: `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
                name: getUnicodeName(ch)
            };
            
            // Get decision from callback
            const decision = await onCharacterDecision(charInfo);
            
            if (decision.action === 'cancel') {
                // User canceled the interactive mode
                return text; // Return original text without changes
            } else if (decision.action === 'keep') {
                // Keep => add to allowed set for this run
                charDecisions[ch] = ch;
            } else if (decision.action === 'remove') {
                // Remove => map to empty string
                charDecisions[ch] = '';
            } else if (decision.action === 'replace') {
                // Replace => use provided replacement
                charDecisions[ch] = decision.replacement || '';
            }
        }
    } else {
        // Non-interactive mode: replace with closest ASCII or remove
        for (const ch of disallowedChars) {
            const closest = closestAscii(ch, allowedCharacters);
            charDecisions[ch] = closest;
        }
    }
    
    // Build the sanitized text
    const sanitizedChars = [];
    for (const ch of text) {
        if (disallowedChars.includes(ch)) {
            sanitizedChars.push(charDecisions[ch]);
        } else {
            sanitizedChars.push(ch);
        }
    }
    
    return sanitizedChars.join('');
}
