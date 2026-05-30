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
}

export function getEditorThemeName(theme: string): string {
  if (theme === "cyberpunk") return "cyberpunk-editor";
  if (theme === "matrix") return "matrix-editor";
  if (theme === "solarized") return "solarized-editor";
  return theme === "light" ? "vs" : "vs-dark";
}
