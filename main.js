const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

let vaultPath = null; // 当前打开的笔记库路径

// 递归读取目录结构
async function readDirectory(dirPath) {
    const items = [];
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const relativePath = path.relative(vaultPath, fullPath);
            
            if (entry.isDirectory()) {
                // 跳过隐藏文件夹
                if (!entry.name.startsWith('.')) {
                    items.push({
                        name: entry.name,
                        path: relativePath,
                        type: 'folder',
                        children: await readDirectory(fullPath)
                    });
                }
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
                items.push({
                    name: entry.name,
                    path: relativePath,
                    type: 'file'
                });
            }
        }
    } catch (error) {
        console.error('Error reading directory:', error);
    }
    
    return items.sort((a, b) => {
        // 文件夹排在前面
        if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });
}

let mainWindow = null;

function createWindow() {
    const preloadPath = path.resolve(__dirname, 'preload.js');
    console.log('[main] preload 脚本路径:', preloadPath);
    console.log('[main] preload 文件是否存在:', fsSync.existsSync(preloadPath));
    
    if (!fsSync.existsSync(preloadPath)) {
        console.error('[main] 错误: preload 文件不存在！');
    }
    
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false // 确保 preload 可以访问 Node.js API
        }
    });

    // 监听 preload 脚本加载错误
    mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
        console.error('[main] ========== PRELOAD 脚本执行错误 ==========');
        console.error('[main] 路径:', preloadPath);
        console.error('[main] 错误:', error);
        console.error('[main] ===========================================');
    });
    
    // 监听所有控制台消息（包括 preload）
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        const source = sourceId ? `[${sourceId}:${line}]` : '';
        console.log(`[console-${level}]${source} ${message}`);
    });
    
    // 监听页面加载
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('[main] 页面加载完成');
        // 开发者工具已关闭
    });

    mainWindow.loadFile('index.html');
    
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    // 先创建窗口
    createWindow();
    
    // 选择笔记库文件夹
    ipcMain.handle('select-folder', async (event) => {
        try {
            const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
            console.log('打开文件夹选择对话框，窗口:', win ? '存在' : '不存在');
            
            if (!win) {
                console.error('无法获取窗口实例');
                return null;
            }
            
            const result = await dialog.showOpenDialog(win, {
                properties: ['openDirectory'],
                title: '选择笔记库文件夹'
            });
            
            console.log('对话框结果:', result);
            
            if (!result.canceled && result.filePaths.length > 0) {
                vaultPath = result.filePaths[0];
                console.log('选择的文件夹路径:', vaultPath);
                return vaultPath;
            }
            return null;
        } catch (error) {
            console.error('选择文件夹时出错:', error);
            return null;
        }
    });

    // 获取文件树
    ipcMain.handle('get-files', async () => {
        if (!vaultPath) return null;
        return await readDirectory(vaultPath);
    });

    // 读取文件内容
    ipcMain.handle('read-file', async (event, filePath) => {
        if (!vaultPath) return null;
        const fullPath = path.join(vaultPath, filePath);
        try {
            const content = await fs.readFile(fullPath, 'utf-8');
            return content;
        } catch (error) {
            console.error('Error reading file:', error);
            return null;
        }
    });

    // 保存文件
    ipcMain.handle('save-file', async (event, filePath, content) => {
        if (!vaultPath) return false;
        const fullPath = path.join(vaultPath, filePath);
        try {
            // 确保目录存在
            const dir = path.dirname(fullPath);
            if (!fsSync.existsSync(dir)) {
                await fs.mkdir(dir, { recursive: true });
            }
            await fs.writeFile(fullPath, content, 'utf-8');
            return true;
        } catch (error) {
            console.error('Error saving file:', error);
            return false;
        }
    });

    // 创建新文件
    ipcMain.handle('create-file', async (event, filePath) => {
        if (!vaultPath) return false;
        const fullPath = path.join(vaultPath, filePath);
        try {
            // 确保目录存在
            const dir = path.dirname(fullPath);
            if (!fsSync.existsSync(dir)) {
                await fs.mkdir(dir, { recursive: true });
            }
            // 如果文件不存在，创建它
            if (!fsSync.existsSync(fullPath)) {
                await fs.writeFile(fullPath, '', 'utf-8');
            }
            return true;
        } catch (error) {
            console.error('Error creating file:', error);
            return false;
        }
    });

    // 删除文件
    ipcMain.handle('delete-file', async (event, filePath) => {
        if (!vaultPath) return false;
        const fullPath = path.join(vaultPath, filePath);
        try {
            await fs.unlink(fullPath);
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    });

    // 获取当前笔记库路径
    ipcMain.handle('get-vault-path', () => {
        return vaultPath;
    });

    // 打开单个Markdown文件
    ipcMain.handle('open-file', async (event) => {
        try {
            console.log('收到 open-file 请求');
            
            // 尝试获取窗口，如果失败则使用主窗口
            let win = null;
            try {
                win = BrowserWindow.fromWebContents(event.sender);
            } catch (e) {
                console.log('无法从 event.sender 获取窗口，使用 mainWindow');
            }
            
            if (!win) {
                win = mainWindow;
            }
            
            if (!win) {
                console.error('无法获取窗口实例，mainWindow:', mainWindow);
                return null;
            }
            
            console.log('准备显示文件选择对话框，窗口ID:', win.id);
            
            const result = await dialog.showOpenDialog(win, {
                properties: ['openFile'],
                filters: [
                    { name: 'Markdown文件', extensions: ['md', 'markdown'] },
                    { name: '所有文件', extensions: ['*'] }
                ],
                title: '打开Markdown文件'
            });
            
            console.log('对话框结果:', JSON.stringify(result));
            
            if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                try {
                    const content = await fs.readFile(filePath, 'utf-8');
                    console.log('成功读取文件:', filePath, '内容长度:', content.length);
                    return {
                        path: filePath,
                        content: content,
                        name: path.basename(filePath)
                    };
                } catch (error) {
                    console.error('Error reading file:', error);
                    console.error('错误堆栈:', error.stack);
                    return null;
                }
            } else {
                console.log('用户取消了选择或没有选择文件');
            }
            return null;
        } catch (error) {
            console.error('打开文件时出错:', error);
            console.error('错误堆栈:', error.stack);
            return null;
        }
    });

    // 保存单独打开的文件（完整路径）
    ipcMain.handle('save-external-file', async (event, filePath, content) => {
        try {
            await fs.writeFile(filePath, content, 'utf-8');
            return true;
        } catch (error) {
            console.error('Error saving external file:', error);
            return false;
        }
    });

    // 窗口已在上面创建，这里不需要再创建

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});