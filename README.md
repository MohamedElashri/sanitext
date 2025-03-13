# SaniText

A browser-based text sanitization tool for detecting and removing potentially problematic characters from text. SaniText helps ensure your text only contains characters you want to allow. It's particularly useful for:

- Detecting homoglyphs and visually similar characters that could be used for spoofing
- Cleaning text input before processing or storing it
- Ensuring text compatibility with systems that only support ASCII
- Identifying and handling unusual Unicode characters

## UI Features

- **Detect Only**: Identifies suspicious characters in your text without modifying it
- **Sanitize Text**: Processes your text by removing or replacing characters that aren't in the allowed set
- **Interactive Mode**: Prompts you to decide what to do with each suspicious character
- **Verbose Mode**: Shows detailed information about detected characters
- **Emoji Support**: Option to allow emoji characters in your text
- **File Input**: Load text directly from files
- **Clipboard Integration**: Easily paste from and copy to clipboard

## How It Works

### Sanitize Text Functionality

When you click the `Sanitize Text` button, SaniText performs the following operations:

1. **Character Analysis**: The tool examines each character in your input text and compares it against a set of allowed characters (by default, only ASCII printable characters are allowed, this can be modified by adding more allowed characters ).

2. **Character Processing**: For each character that isn't in the allowed set, SaniText will:
   - In **Interactive Mode**: Display a prompt showing information about the character and ask you to decide whether to keep, remove, or replace it. Replacements are made based on your choice so you should be using it if you want to have custom replacement and overwrite the default replacements.

   - In **Automatic Mode**: Try to replace it with a similar ASCII character if possible (using `homoglyph mapping` and `Unicode normalization`), or remove it entirely. This is the default mode.

3. **Text Reconstruction**: After all suspicious characters have been processed, SaniText builds the sanitized text using your decisions or automatic replacements.

4. **Output Display**: The sanitized text is displayed in the output area, ready to be copied or further processed.

The sanitization process preserves all allowed characters exactly as they appear in the original text, only modifying or removing characters that could be problematic.

## Usage
The usage is very simple:

1. Enter or paste text in the input area
2. Configure options as needed:
   - Check "Allow Emoji" to preserve emoji characters
   - Check "Interactive Mode" to be prompted for each suspicious character
   - Check "Verbose Mode" to see detailed information about detected characters
3. Click "Sanitize Text" to process your text
4. Review the output and copy it to your clipboard if desired

## Technical Details

SaniText uses several techniques to handle suspicious characters:

- **Homoglyph Mapping**: Replaces visually similar characters with their ASCII equivalents
- **Unicode Normalization**: Converts compatible characters to their canonical forms
- **Character Set Filtering**: Ensures only characters from the allowed set remain in the text

## Browser Compatibility

SaniText works in all modern browsers that support JavaScript ES6 features.

## Acknowledgments

The idea behind this project is inspired and based on the work of [panispani/sanitext](https://github.com/panispani/sanitext)

## License

This project is open source and available under the MIT License.
