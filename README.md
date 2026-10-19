# AbysaCompiler

**AbysaCompiler — a powerful code editor with built-in AI assistance.**

This compiler includes a built-in AI assistant. To use it, type `//ai <your prompt>` in the editor and press `Tab`.

Currently, code execution is supported only for C++.

## Features

- `msv` + `Tab` — generates an array.
- `mtx` + `Tab` — generates a matrix.
- `Cmd + P` or `Ctrl + P` — formats your code, similar to Prettier in VS Code.
- `#` + `Tab` — generates a basic code template.

## How to Enable AI

1. Make sure Node.js is installed.
2. Store your API key in a file named `api-key.txt`.
3. Open a terminal in the project directory.
4. Run the following command:

   `node ai-server.js`

**Important:** Never upload your `api-key.txt` file to GitHub. Add it to `.gitignore` to keep your API key private.

More exciting features are coming soon!
