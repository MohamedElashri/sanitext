/**
 * Connect the text workspace to the browser's clipboard, filesystem, and sanitizer.
 */
document.addEventListener('DOMContentLoaded', () => {
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const inputCount = document.getElementById('inputCount');
    const outputCount = document.getElementById('outputCount');
    const detectedInfo = document.getElementById('detectedInfo');
    const findingsTitle = document.getElementById('findingsTitle');
    const findingsList = document.getElementById('findingsList');
    const pasteBtn = document.getElementById('pasteBtn');
    const openFileBtn = document.getElementById('openFileBtn');
    const loadInputFile = document.getElementById('loadInputFile');
    const clearBtn = document.getElementById('clearBtn');
    const exampleBtn = document.getElementById('exampleBtn');
    const detectBtn = document.getElementById('detectBtn');
    const sanitizeBtn = document.getElementById('sanitizeBtn');
    const copyBtn = document.getElementById('copyBtn');
    const settings = document.getElementById('settings');
    const allowEmoji = document.getElementById('allowEmoji');
    const interactiveMode = document.getElementById('interactiveMode');
    const verboseMode = document.getElementById('verboseMode');
    const interactivePrompt = document.getElementById('interactivePrompt');
    const promptGlyph = document.getElementById('promptGlyph');
    const promptCode = document.getElementById('promptCode');
    const promptName = document.getElementById('promptName');
    const replacementInput = document.getElementById('replacementInput');
    const replacementChar = document.getElementById('replacementChar');
    const toast = document.getElementById('toast');

    const example = 'Неllo\u200B, world!';
    const numberFormat = new Intl.NumberFormat(document.documentElement.lang);
    let inputRevision = 0;
    let resolveDecision;
    let isSanitizing = false;
    let toastTimer;

    inputText.addEventListener('input', inputChanged);
    pasteBtn.addEventListener('click', pasteFromClipboard);
    copyBtn.addEventListener('click', copyToClipboard);
    openFileBtn.addEventListener('click', () => loadInputFile.click());
    loadInputFile.addEventListener('change', loadFile);
    clearBtn.addEventListener('click', () => setInput(''));
    exampleBtn.addEventListener('click', () => setInput(example));
    detectBtn.addEventListener('click', detectOnly);
    sanitizeBtn.addEventListener('click', sanitize);
    allowEmoji.addEventListener('change', resetResults);
    interactiveMode.addEventListener('change', resetResults);
    verboseMode.addEventListener('change', resetResults);

    document.addEventListener('click', event => {
        if (settings.open && !settings.contains(event.target)) settings.open = false;
    });
    settings.addEventListener('keydown', event => {
        if (event.key === 'Escape' && settings.open) {
            settings.open = false;
            settings.querySelector('summary').focus();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.isComposing && !isSanitizing) {
            event.preventDefault();
            if (!event.repeat) sanitize();
        }
    });

    document.getElementById('keepBtn').addEventListener('click', () => finishDecision('keep'));
    document.getElementById('removeBtn').addEventListener('click', () => finishDecision('remove'));
    document.getElementById('closePromptBtn').addEventListener('click', () => finishDecision('cancel'));
    document.getElementById('replaceBtn').addEventListener('click', () => {
        replacementInput.hidden = false;
        replacementChar.focus();
    });
    replacementInput.addEventListener('submit', event => {
        event.preventDefault();
        finishDecision('replace', replacementChar.value);
    });
    interactivePrompt.addEventListener('cancel', event => {
        event.preventDefault();
        finishDecision('cancel');
    });

    inputChanged();

    function countLabel(value) {
        let count = 0;
        for (const character of value) count++;
        return numberFormat.format(count) + (count === 1 ? ' character' : ' characters');
    }

    function inputChanged() {
        inputRevision++;
        inputCount.textContent = countLabel(inputText.value);
        clearBtn.hidden = !inputText.value;
        exampleBtn.disabled = Boolean(inputText.value);
        resetResults();
    }

    function setInput(value) {
        inputText.value = value;
        inputChanged();
        inputText.focus();
    }

    function resetResults() {
        setOutput('');
        detectedInfo.hidden = true;
        findingsList.replaceChildren();
    }

    function setOutput(value, emptyMessage = '') {
        outputText.value = value;
        outputText.placeholder = emptyMessage;
        outputCount.textContent = countLabel(outputText.value);
        copyBtn.disabled = !outputText.value;
    }

    function getInput() {
        if (!inputText.value) {
            showToast('Enter text or try the example to get started.', true);
            inputText.focus();
        }
        return inputText.value;
    }

    async function pasteFromClipboard() {
        const revision = ++inputRevision;
        try {
            const value = await navigator.clipboard.readText();
            if (revision === inputRevision && !isSanitizing) setInput(value);
        } catch {
            showToast('Clipboard access failed. Paste directly into the input field.', true);
            inputText.focus();
        }
    }

    async function copyToClipboard() {
        const value = outputText.value;
        try {
            await navigator.clipboard.writeText(value);
            showToast('Copied to clipboard.');
        } catch {
            if (value === outputText.value) outputText.select();
            showToast('Clipboard access failed. Copy the selected text manually.', true);
        }
    }

    async function loadFile() {
        const [file] = loadInputFile.files;
        loadInputFile.value = '';
        if (!file) return;

        const revision = ++inputRevision;
        try {
            const bytes = new Uint8Array(await file.arrayBuffer());
            if (revision !== inputRevision || isSanitizing) return;
            let value;
            try {
                // Retain the BOM, if present, so detection can report it.
                value = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
            } catch {
                // Preserve the byte-by-byte interpretation of non-UTF-8 files.
                value = '';
                for (const byte of bytes) value += String.fromCharCode(byte);
            }
            setInput(value);
            showToast('Opened ' + file.name + '.');
        } catch {
            showToast('The file could not be opened.', true);
        }
    }

    function detectOnly() {
        const value = getInput();
        if (!value) return;

        const allowed = getAllowedCharacters({ allowEmoji: allowEmoji.checked });
        showFindings(detectSuspiciousCharacters(value, allowed), verboseMode.checked);
        findingsTitle.focus();
    }

    async function sanitize() {
        if (isSanitizing) return;
        const value = getInput();
        if (!value) return;

        const allowedCharacters = getAllowedCharacters({ allowEmoji: allowEmoji.checked });
        const interactive = interactiveMode.checked;
        const verbose = verboseMode.checked;
        let cancelled = false;

        isSanitizing = true;
        try {
            if (verbose) showFindings(detectSuspiciousCharacters(value, allowedCharacters), true);
            const cleaned = await sanitizeText(value, {
                allowedCharacters,
                interactive,
                async onCharacterDecision(character) {
                    const decision = await promptForDecision(character);
                    cancelled = decision.action === 'cancel';
                    return decision;
                }
            });

            if (cancelled) {
                showToast('Sanitization canceled.');
                return;
            }

            const emptyMessage = cleaned ? '' : 'All input characters were removed';
            setOutput(cleaned, emptyMessage);
            showToast(emptyMessage || (cleaned === value ? 'No changes needed.' : 'Text sanitized.'));
        } catch {
            showToast('Could not sanitize the text. Try again.', true);
        } finally {
            isSanitizing = false;
        }
    }

    function characterGlyph(character) {
        return /[\p{Default_Ignorable_Code_Point}\p{White_Space}\p{Cc}]/u.test(character) ? '␣' : character;
    }

    function characterName(item) {
        if (item.char === '\u200B') return 'Zero-width space';
        if (item.char === '\uFEFF') return 'Byte order mark';
        if (!item.name.startsWith('Character at code point')) return item.name;
        if (/\p{Script=Cyrillic}/u.test(item.char)) return 'Cyrillic character';
        if (/\p{Extended_Pictographic}/u.test(item.char)) return 'Pictographic character';
        if (/\p{Cf}/u.test(item.char)) return 'Format character';
        if (/\p{Cc}/u.test(item.char)) return 'Control character';
        if (/\p{White_Space}/u.test(item.char)) return 'Whitespace character';
        return 'Unicode character';
    }

    function showFindings(detected, verbose) {
        const unique = new Map();
        for (const item of detected) {
            const previous = unique.get(item.char);
            if (previous) {
                previous.count++;
            } else {
                unique.set(item.char, { ...item, count: 1 });
            }
        }

        findingsTitle.textContent = detected.length
            ? numberFormat.format(detected.length) + (detected.length === 1 ? ' flagged character' : ' flagged characters')
            : 'No suspicious characters found';

        const rows = document.createDocumentFragment();
        for (const item of unique.values()) {
            const row = document.createElement('li');
            const glyph = document.createElement('span');
            glyph.className = 'character-glyph';
            glyph.setAttribute('aria-hidden', 'true');
            glyph.textContent = characterGlyph(item.char);
            const detail = document.createElement('div');
            const code = document.createElement('code');
            code.textContent = verbose ? item.hexCode + ' · ' + item.codePoint : item.hexCode;
            const name = document.createElement('p');
            const occurrences = numberFormat.format(item.count) + (item.count === 1 ? ' occurrence' : ' occurrences');
            name.textContent = characterName(item) + (verbose ? ' · ' + occurrences : '');
            detail.append(code, name);
            row.append(glyph, detail);
            rows.append(row);
        }

        findingsList.replaceChildren(rows);
        findingsList.hidden = !unique.size;
        detectedInfo.hidden = false;
    }

    function promptForDecision(character) {
        promptGlyph.textContent = characterGlyph(character.char);
        promptCode.textContent = character.hexCode;
        promptName.textContent = characterName(character);
        replacementInput.hidden = true;
        replacementChar.value = '';
        return new Promise(resolve => {
            resolveDecision = resolve;
            interactivePrompt.showModal();
        });
    }

    function finishDecision(action, replacement) {
        interactivePrompt.close();
        resolveDecision({ action, replacement });
        resolveDecision = undefined;
    }

    function showToast(message, error = false) {
        clearTimeout(toastTimer);
        toast.dataset.error = error;
        toast.textContent = message;
        toastTimer = setTimeout(() => { toast.textContent = ''; }, 3500);
    }
});
