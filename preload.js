// preload.js - 在隔离的上下文中运行
console.log('[preload] preload.js 开始执行');

// 加载 Electron 模块
const { contextBridge, ipcRenderer } = require('electron');
console.log('[preload] electron 模块加载完成');
console.log('[preload] contextBridge 存在:', !!contextBridge);
console.log('[preload] ipcRenderer 存在:', !!ipcRenderer);

if (!contextBridge) {
    console.error('[preload] 错误: contextBridge 不可用！');
}

if (!ipcRenderer) {
    console.error('[preload] 错误: ipcRenderer 不可用！');
}

const { marked } = require('marked');

console.log('[preload] 模块加载完成');

// 配置marked选项
marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: true,
    mangle: false
});

console.log('[preload] marked 配置完成');

// 暴露 API 到渲染进程
if (contextBridge && ipcRenderer) {
    try {
        console.log('[preload] 开始暴露 notesAPI...');
        
        const api = {
            selectFolder: () => {
                console.log('[preload] selectFolder 被调用');
                return ipcRenderer.invoke('select-folder');
            },
            getFiles: () => ipcRenderer.invoke('get-files'),
            readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
            saveFile: (filePath, content) => ipcRenderer.invoke('save-file', filePath, content),
            saveExternalFile: (filePath, content) => ipcRenderer.invoke('save-external-file', filePath, content),
            getVaultPath: () => ipcRenderer.invoke('get-vault-path'),
            openFile: () => {
                console.log('[preload] openFile 被调用');
                return ipcRenderer.invoke('open-file');
            },
            parseMarkdown: (text) => marked.parse(text || "")
        };
        
        contextBridge.exposeInMainWorld('notesAPI', api);
        console.log('[preload] notesAPI 已成功暴露到 window 对象');
        console.log('[preload] API 方法:', Object.keys(api));
    } catch (error) {
        console.error('[preload] 暴露 notesAPI 时出错:', error);
        console.error('[preload] 错误堆栈:', error.stack);
    }
} else {
    console.error('[preload] 无法暴露 notesAPI: contextBridge 或 ipcRenderer 不可用');
}