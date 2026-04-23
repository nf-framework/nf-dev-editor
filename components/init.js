import "/@editor/components/editor-iconset.js";
import "/@editor/lib/shortcut.js";

const editorRuntime = window.__nfDevEditorRuntime || (window.__nfDevEditorRuntime = {
    initialized: false,
    opening: false,
    lastAltLeftAt: 0
});

async function openEditor() {
    if (document.querySelector('pl-editor-main')) return;
    if (editorRuntime.opening) return;
    editorRuntime.opening = true;
    if (!customElements.get('pl-editor-main')) {
        await import("/@editor/components/editor-main.js");
    }
    try {
        if (document.querySelector('pl-editor-main')) return;
        const EditorMain = customElements.get('pl-editor-main');
        if (!EditorMain) return;
        const editor = new EditorMain();
        document.body.appendChild(editor);
    } finally {
        editorRuntime.opening = false;
    }
}

window.nfDevEditorOpen = openEditor;

if (!editorRuntime.initialized) {
    editorRuntime.initialized = true;
    const shortcutApi = globalThis.shortcut || window.shortcut || null;
    if (shortcutApi?.listen) {
        shortcutApi.listen(['AltLeft', 'AltLeft'], openEditor);
    } else {
        window.addEventListener('keydown', (e) => {
            if (e.code !== 'AltLeft') return;
            const now = Date.now();
            if (now - editorRuntime.lastAltLeftAt <= 400) {
                editorRuntime.lastAltLeftAt = 0;
                openEditor();
                e.preventDefault();
                return;
            }
            editorRuntime.lastAltLeftAt = now;
        });
    }
}
