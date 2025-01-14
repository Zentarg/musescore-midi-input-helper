# My Chrome Extension

This is a simple Chrome extension that demonstrates basic functionality using JavaScript.

## Project Structure

```
my-chrome-extension
├── src
│   ├── background.js      # Background script for handling events and state
│   ├── content.js         # Content script for manipulating web page DOM
│   └── popup.js           # Script for the popup interface
├── manifest.json          # Configuration file for the Chrome extension
└── README.md              # Documentation for the project
```

## Installation

1. Clone the repository or download the source code.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" using the toggle in the top right corner.
4. Click on "Load unpacked" and select the `my-chrome-extension` directory.

## Usage

- Click on the extension icon in the Chrome toolbar to open the popup.
- The background script will run in the background and handle any necessary events.
- The content script will interact with the web pages as specified.

## License

This project is licensed under the MIT License.