/**
 * SaniText - Main application script
 * Handles UI interactions and connects the sanitization functionality
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const detectedInfo = document.getElementById('detectedInfo');
    const pasteBtn = document.getElementById('pasteBtn');
    const detectBtn = document.getElementById('detectBtn');
    const sanitizeBtn = document.getElementById('sanitizeBtn');
    const copyBtn = document.getElementById('copyBtn');
    const allowEmoji = document.getElementById('allowEmoji');
    const allowChars = document.getElementById('allowChars');
    const loadInputFile = document.getElementById('loadInputFile');
    const interactiveMode = document.getElementById('interactiveMode');
    const verboseMode = document.getElementById('verboseMode');
    const interactivePrompt = document.getElementById('interactivePrompt');
    const charInfo = document.getElementById('charInfo');
    const keepBtn = document.getElementById('keepBtn');
    const removeBtn = document.getElementById('removeBtn');
    const replaceBtn = document.getElementById('replaceBtn');
    const replacementInput = document.getElementById('replacementInput');
    const replacementChar = document.getElementById('replacementChar');
    const confirmReplaceBtn = document.getElementById('confirmReplaceBtn');
    const closePromptBtn = document.getElementById('closePromptBtn');
    
    // State variables
    let currentCharacterDecision = null;
    let characterDecisionResolve = null;
    
    // Event Listeners
    pasteBtn.addEventListener('click', pasteFromClipboard);
    detectBtn.addEventListener('click', detectOnly);
    sanitizeBtn.addEventListener('click', sanitizeTextHandler);
    copyBtn.addEventListener('click', copyToClipboard);
    loadInputFile.addEventListener('change', handleInputFileUpload);
    keepBtn.addEventListener('click', () => resolveCharacterDecision('keep'));
    removeBtn.addEventListener('click', () => resolveCharacterDecision('remove'));
    replaceBtn.addEventListener('click', showReplacementInput);
    confirmReplaceBtn.addEventListener('click', confirmReplacement);
    closePromptBtn.addEventListener('click', closePrompt);
    
    /**
     * Paste text from clipboard
     */
    async function pasteFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            inputText.value = text;
        } catch (err) {
            showToast('Failed to read from clipboard. Please paste manually.', 'error');
        }
    }
    
    /**
     * Detect suspicious characters only
     */
    function detectOnly() {
        const text = inputText.value;
        if (!text) {
            showToast('No text provided.', 'error');
            return;
        }
        
        const allowedCharacters = getAllowedCharacters({
            allowEmoji: allowEmoji.checked
        });
        
        const detected = detectSuspiciousCharacters(text, allowedCharacters);
        displayDetectedInfo(detected);
    }
    
    /**
     * Handle text sanitization
     */
    async function sanitizeTextHandler() {
        const text = inputText.value;
        if (!text) {
            showToast('No text provided.', 'error');
            return;
        }
        
        const allowedCharacters = getAllowedCharacters({
            allowEmoji: allowEmoji.checked
        });
        
        if (verboseMode.checked) {
            const detected = detectSuspiciousCharacters(text, allowedCharacters);
            displayDetectedInfo(detected);
        }
        
        try {
            const sanitized = await sanitizeText(text, {
                allowedCharacters,
                interactive: interactiveMode.checked,
                onCharacterDecision: interactiveMode.checked ? promptForCharacterDecision : null
            });
            
            outputText.value = sanitized;
            
            if (sanitized !== text) {
                showToast('Text sanitized successfully!', 'success');
            } else {
                showToast('No changes needed!', 'info');
            }
        } catch (error) {
            showToast('Error sanitizing text: ' + error.message, 'error');
        }
    }
    
    /**
     * Copy sanitized text to clipboard
     */
    async function copyToClipboard() {
        const text = outputText.value;
        if (!text) {
            showToast('No text to copy.', 'error');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(text);
            showToast('Copied to clipboard!', 'success');
        } catch (err) {
            showToast('Failed to copy to clipboard.', 'error');
        }
    }
    

    
    /**
     * Display detected suspicious characters
     */
    function displayDetectedInfo(detected) {
        if (detected.length === 0) {
            detectedInfo.innerHTML = '<p>No suspicious characters detected.</p>';
        } else {
            let html = '<h3>Detected Suspicious Characters:</h3>';
            if (verboseMode.checked) {
                // Create a map to store unique characters and their count
                const uniqueChars = new Map();
                detected.forEach(item => {
                    if (!uniqueChars.has(item.char)) {
                        uniqueChars.set(item.char, { ...item, count: 1 });
                    } else {
                        uniqueChars.get(item.char).count++;
                    }
                });

                html += '<div class="verbose-info">';
                html += `<p>Total suspicious characters found: ${detected.length}</p>`;
                html += '<ul>';
                uniqueChars.forEach(item => {
                    html += `<li>
                        <div class="char-details">
                            <span class="suspicious-char">${item.char}</span>
                            <span class="char-info">Unicode: ${item.hexCode}</span>
                            <span class="char-info">Code Point: ${item.codePoint}</span>
                            <span class="char-info">Name: ${item.name}</span>
                            <span class="char-info">Occurrences: ${item.count}</span>
                            ${item.name.toLowerCase().includes('emoji') ? `<span class="char-info emoji-display">Emoji: ${item.char}</span>` : ''}
                        </div>
                    </li>`;
                });
                html += '</ul></div>';
            } else {
                const uniqueChars = [...new Set(detected.map(item => item))];
                html += '<ul>';
                uniqueChars.forEach(item => {
                    html += `<li><span class="suspicious-char">${item.char}</span> - ${item.hexCode} (${item.name})</li>`;
                });
                html += '</ul>';
            }
            detectedInfo.innerHTML = html;
        }
        detectedInfo.classList.add('show');
    }
    
    /**
     * Prompt user for character decision in interactive mode
     */
    function promptForCharacterDecision(charDetails) {
        return new Promise(resolve => {
            characterDecisionResolve = resolve;
            currentCharacterDecision = charDetails;
            
            // Update the prompt with character info
            charInfo.innerHTML = `Character <span class="suspicious-char">${charDetails.char}</span> (${charDetails.hexCode}, ${charDetails.name}) is not allowed.`;
            
            // Show the prompt
            interactivePrompt.classList.add('show');
            replacementInput.classList.remove('show');
        });
    }
    
    /**
     * Resolve character decision
     */
    function resolveCharacterDecision(action) {
        if (characterDecisionResolve) {
            characterDecisionResolve({ action });
            characterDecisionResolve = null;
            interactivePrompt.classList.remove('show');
        }
    }
    
    /**
     * Close the interactive prompt without making a decision
     */
    function closePrompt() {
        if (characterDecisionResolve) {
            characterDecisionResolve({ action: 'cancel' });
            characterDecisionResolve = null;
            interactivePrompt.classList.remove('show');
            replacementInput.classList.remove('show');
        }
    }
    
    /**
     * Show replacement input field
     */
    function showReplacementInput() {
        replacementInput.classList.add('show');
        replacementChar.value = '';
        replacementChar.focus();
    }
    
    /**
     * Confirm replacement character
     */
    function confirmReplacement() {
        const replacement = replacementChar.value;
        if (characterDecisionResolve) {
            characterDecisionResolve({ 
                action: 'replace', 
                replacement 
            });
            characterDecisionResolve = null;
            interactivePrompt.classList.remove('show');
            replacementInput.classList.remove('show');
        }
    }
    
    /**
     * Show toast notification
     */
    function showToast(message, type = 'info') {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create new toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Show and then hide after delay
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    /**
     * Handle file upload for input text
     * Loads the file content directly into the input text area without converting to plain text
     */
    function handleInputFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            // Get the array buffer
            const arrayBuffer = e.target.result;
            
            // Convert to a Uint8Array to work with binary data
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Convert to a string preserving all bytes
            let binaryString = '';
            for (let i = 0; i < uint8Array.length; i++) {
                binaryString += String.fromCharCode(uint8Array[i]);
            }
            
            // Set the binary string directly to the input text area
            inputText.value = binaryString;
            showToast(`File loaded: ${file.name}`, 'success');
        };
        reader.onerror = function() {
            showToast('Error reading file.', 'error');
        };
        
        // Read as array buffer to preserve binary data
        reader.readAsArrayBuffer(file);
    }
    
});
