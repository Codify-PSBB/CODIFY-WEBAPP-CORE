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

  monaco.editor.defineTheme('forest-editor', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5c735c', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'a3d9a5', fontStyle: 'bold' },
      { token: 'number', foreground: 'd1e8d5' },
      { token: 'string', foreground: '8fb392' },
      { token: 'type', foreground: 'a3d9a5' },
      { token: 'class', foreground: 'a3d9a5' },
      { token: 'function', foreground: 'c4e3c6' },
    ],
    colors: {
      'editor.background': '#151f15',
      'editor.foreground': '#d1e8d5',
      'editor.lineHighlightBackground': '#1e291e',
      'editorCursor.foreground': '#a3d9a5',
      'editorLineNumber.foreground': '#485c48',
      'editorLineNumber.activeForeground': '#a3d9a5',
      'editor.selectionBackground': '#a3d9a540',
    }
  });

  monaco.editor.defineTheme('sakura-editor', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: 'b88c9a', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'e66786', fontStyle: 'bold' },
      { token: 'number', foreground: 'cc7a92' },
      { token: 'string', foreground: 'f099b0' },
      { token: 'type', foreground: 'e66786' },
      { token: 'class', foreground: 'e66786' },
      { token: 'function', foreground: 'd95576' },
    ],
    colors: {
      'editor.background': '#fff5f7',
      'editor.foreground': '#5c3340',
      'editor.lineHighlightBackground': '#ffe6eb',
      'editorCursor.foreground': '#e66786',
      'editorLineNumber.foreground': '#d9aab5',
      'editorLineNumber.activeForeground': '#e66786',
      'editor.selectionBackground': '#f099b060',
    }
  });

  monaco.editor.defineTheme('dracula-editor', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff79c6', fontStyle: 'bold' },
      { token: 'number', foreground: 'bd93f9' },
      { token: 'string', foreground: 'f1fa8c' },
      { token: 'type', foreground: '8be9fd' },
      { token: 'class', foreground: '8be9fd' },
      { token: 'function', foreground: '50fa7b' },
    ],
    colors: {
      'editor.background': '#282a36',
      'editor.foreground': '#f8f8f2',
      'editor.lineHighlightBackground': '#44475a',
      'editorCursor.foreground': '#ff79c6',
      'editorLineNumber.foreground': '#6272a4',
      'editorLineNumber.activeForeground': '#ff79c6',
      'editor.selectionBackground': '#44475a80',
    }
  });

  monaco.editor.defineTheme('ocean-editor', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '547b97', fontStyle: 'italic' },
      { token: 'keyword', foreground: '4adbc8', fontStyle: 'bold' },
      { token: 'number', foreground: '94e2d5' },
      { token: 'string', foreground: 'a6e3a1' },
      { token: 'type', foreground: '89dceb' },
      { token: 'class', foreground: '89dceb' },
      { token: 'function', foreground: '89b4fa' },
    ],
    colors: {
      'editor.background': '#0f1c2e',
      'editor.foreground': '#cdd6f4',
      'editor.lineHighlightBackground': '#1e2e4a',
      'editorCursor.foreground': '#4adbc8',
      'editorLineNumber.foreground': '#455a64',
      'editorLineNumber.activeForeground': '#4adbc8',
      'editor.selectionBackground': '#4adbc840',
    }
  });

  monaco.editor.defineTheme('sunset-editor', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8c6060', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff8b5a', fontStyle: 'bold' },
      { token: 'number', foreground: 'f9e2af' },
      { token: 'string', foreground: 'fab387' },
      { token: 'type', foreground: 'ffb86c' },
      { token: 'class', foreground: 'ffb86c' },
      { token: 'function', foreground: 'f38ba8' },
    ],
    colors: {
      'editor.background': '#2d1b2e',
      'editor.foreground': '#f8e2e2',
      'editor.lineHighlightBackground': '#3f2540',
      'editorCursor.foreground': '#ff8b5a',
      'editorLineNumber.foreground': '#7a4f5f',
      'editorLineNumber.activeForeground': '#ff8b5a',
      'editor.selectionBackground': '#ff8b5a40',
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
  if (theme === "forest") return "forest-editor";
  if (theme === "sakura") return "sakura-editor";
  if (theme === "dracula") return "dracula-editor";
  if (theme === "ocean") return "ocean-editor";
  if (theme === "sunset") return "sunset-editor";
  if (theme === "light") return "vs";
  return "vs-dark";
}
