export function defineEditorThemes(monaco: any) {
  monaco.editor.defineTheme('cyberpunk-editor', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '7c6a9c', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff007f', fontStyle: 'bold' },
      { token: 'number', foreground: '00ffcc' },
      { token: 'string', foreground: 'ffff00' },
      { token: 'type', foreground: '00ffff' },
      { token: 'class', foreground: '00ffff' },
      { token: 'function', foreground: '00ffcc' },
    ],
    colors: {
      'editor.background': '#0c081e',
      'editor.foreground': '#00ffcc',
      'editor.lineHighlightBackground': '#1d123d',
      'editorCursor.foreground': '#ff007f',
      'editorLineNumber.foreground': '#5c5482',
      'editorLineNumber.activeForeground': '#ff007f',
      'editor.selectionBackground': '#ff007f33',
    }
  });

  monaco.editor.defineTheme('matrix-editor', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '15803d', fontStyle: 'italic' },
      { token: 'keyword', foreground: '39ff14', fontStyle: 'bold' },
      { token: 'number', foreground: '86efac' },
      { token: 'string', foreground: '22c55e' },
      { token: 'type', foreground: '4ade80' },
      { token: 'class', foreground: '4ade80' },
      { token: 'function', foreground: '39ff14' },
    ],
    colors: {
      'editor.background': '#000000',
      'editor.foreground': '#39ff14',
      'editor.lineHighlightBackground': '#0c140c',
      'editorCursor.foreground': '#39ff14',
      'editorLineNumber.foreground': '#15803d',
      'editorLineNumber.activeForeground': '#39ff14',
      'editor.selectionBackground': '#39ff1422',
    }
  });

  monaco.editor.defineTheme('solarized-editor', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8a7258', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'e28743', fontStyle: 'bold' },
      { token: 'number', foreground: 'fbbf24' },
      { token: 'string', foreground: 'd97706' },
      { token: 'type', foreground: 'fbbf24' },
      { token: 'class', foreground: 'fbbf24' },
      { token: 'function', foreground: 'e28743' },
    ],
    colors: {
      'editor.background': '#18120c',
      'editor.foreground': '#f4e8c1',
      'editor.lineHighlightBackground': '#2b1f15',
      'editorCursor.foreground': '#e28743',
      'editorLineNumber.foreground': '#5c4531',
      'editorLineNumber.activeForeground': '#e28743',
      'editor.selectionBackground': '#e2874333',
    }
  });
  monaco.editor.defineTheme('nordic-editor', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
      { token: 'keyword', foreground: '0284c7', fontStyle: 'bold' },
      { token: 'number', foreground: '0369a1' },
      { token: 'string', foreground: '0ea5e9' },
      { token: 'type', foreground: '0369a1' },
      { token: 'class', foreground: '0369a1' },
      { token: 'function', foreground: '0284c7' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#0f172a',
      'editor.lineHighlightBackground': '#f1f5f9',
      'editorCursor.foreground': '#38bdf8',
      'editorLineNumber.foreground': '#94a3b8',
      'editorLineNumber.activeForeground': '#0284c7',
      'editor.selectionBackground': '#bae6fd80',
    }
  });

  monaco.editor.defineTheme('paper-editor', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '70635c', fontStyle: 'italic' },
      { token: 'keyword', foreground: '8c2f2f', fontStyle: 'bold' },
      { token: 'number', foreground: '5c4e47' },
      { token: 'string', foreground: '8c2f2f' },
      { token: 'type', foreground: '4a3f3b' },
      { token: 'class', foreground: '4a3f3b' },
      { token: 'function', foreground: '8c2f2f' },
    ],
    colors: {
      'editor.background': '#fdfbf7',
      'editor.foreground': '#2b2523',
      'editor.lineHighlightBackground': '#f4f1ea',
      'editorCursor.foreground': '#8c2f2f',
      'editorLineNumber.foreground': '#d4cfc4',
      'editorLineNumber.activeForeground': '#8c2f2f',
      'editor.selectionBackground': '#d1c8b880',
    }
  });

  monaco.editor.defineTheme('synthwave-editor', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '9a66c4', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff007f', fontStyle: 'bold' },
      { token: 'number', foreground: '00ffff' },
      { token: 'string', foreground: 'ffb8d2' },
      { token: 'type', foreground: '00ffff' },
      { token: 'class', foreground: '00ffff' },
      { token: 'function', foreground: 'ff007f' },
    ],
    colors: {
      'editor.background': '#0d0221',
      'editor.foreground': '#f4d9ff',
      'editor.lineHighlightBackground': '#2b0b5c',
      'editorCursor.foreground': '#00ffff',
      'editorLineNumber.foreground': '#5c4d80',
      'editorLineNumber.activeForeground': '#ff007f',
      'editor.selectionBackground': '#ff007f40',
    }
  });

  monaco.editor.defineTheme('ethereal-editor', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: 'a69bb8', fontStyle: 'italic' },
      { token: 'keyword', foreground: '7d5cd1', fontStyle: 'bold' },
      { token: 'number', foreground: '9b82e3' },
      { token: 'string', foreground: '5c4d80' },
      { token: 'type', foreground: '7d5cd1' },
      { token: 'class', foreground: '7d5cd1' },
      { token: 'function', foreground: '9b82e3' },
    ],
    colors: {
      'editor.background': '#fbf9ff',
      'editor.foreground': '#4a4063',
      'editor.lineHighlightBackground': '#f1edfa',
      'editorCursor.foreground': '#9b82e3',
      'editorLineNumber.foreground': '#c6b5f0',
      'editorLineNumber.activeForeground': '#7d5cd1',
      'editor.selectionBackground': '#e0d4f780',
    }
  });

  monaco.editor.defineTheme('academia-editor', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8a7f76', fontStyle: 'italic' },
      { token: 'keyword', foreground: '8c001a', fontStyle: 'bold' },
      { token: 'number', foreground: 'd6b885' },
      { token: 'string', foreground: 'e6dfd3' },
      { token: 'type', foreground: 'd6b885' },
      { token: 'class', foreground: 'd6b885' },
      { token: 'function', foreground: '8c001a' },
    ],
    colors: {
      'editor.background': '#1a1817',
      'editor.foreground': '#e6dfd3',
      'editor.lineHighlightBackground': '#24211f',
      'editorCursor.foreground': '#8c001a',
      'editorLineNumber.foreground': '#4a413b',
      'editorLineNumber.activeForeground': '#d6b885',
      'editor.selectionBackground': '#8c001a40',
    }
  });
}

export function getEditorThemeName(theme: string): string {
  if (theme === "cyberpunk") return "cyberpunk-editor";
  if (theme === "matrix") return "matrix-editor";
  if (theme === "solarized") return "solarized-editor";
  if (theme === "nordic") return "nordic-editor";
  if (theme === "paper") return "paper-editor";
  if (theme === "synthwave") return "synthwave-editor";
  if (theme === "ethereal") return "ethereal-editor";
  if (theme === "academia") return "academia-editor";
  if (theme === "light") return "vs";
  return "vs-dark";
}
