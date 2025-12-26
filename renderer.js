// DOM 元素
let fileTree, vaultName, filePath, markdownInput, markdownPreview;
let openFolderBtn, openFileBtn, editorContainer, divider;

// 状态
let currentFilePath = null;
let currentFileFullPath = null; // 完整文件路径（用于打开单个文件时）
let fileTreeData = null;
let viewMode = 'split'; // 'split', 'editor', 'preview'
let isDragging = false;

// 初始化
let initAttempts = 0;
const maxInitAttempts = 50; // 最多尝试5秒

async function init() {
    initAttempts++;
    
    // 等待 notesAPI 可用
    if (!window.notesAPI) {
        if (initAttempts < maxInitAttempts) {
            console.log(`[renderer] notesAPI 未加载，等待中... (${initAttempts}/${maxInitAttempts})`);
            setTimeout(init, 100);
            return;
        } else {
            console.error('[renderer] notesAPI 加载超时，请检查 preload.js 是否正确加载');
            alert('API 加载失败，请刷新页面或检查控制台错误');
            return;
        }
    }
    
    console.log('[renderer] notesAPI 已加载，开始初始化');
    initAttempts = 0; // 重置计数器
    
    // 获取DOM元素
    fileTree = document.getElementById('file-tree');
    vaultName = document.getElementById('vault-name');
    filePath = document.getElementById('file-path');
    markdownInput = document.getElementById('markdown-input');
    markdownPreview = document.getElementById('markdown-preview');
    openFolderBtn = document.getElementById('open-folder-btn');
    openFileBtn = document.getElementById('open-file-btn');
    editorContainer = document.getElementById('editor-container');
    divider = document.getElementById('divider');
    
    // 检查元素是否存在
    if (!openFolderBtn) {
        console.error('open-folder-btn 按钮元素未找到');
    }
    if (!openFileBtn) {
        console.error('open-file-btn 按钮元素未找到');
    }
    
    if (!openFolderBtn || !openFileBtn) {
        console.error('按钮元素未找到，无法继续初始化');
        return;
    }
    
    console.log('按钮元素找到，设置事件监听器');
    
    // 先设置事件监听器
    setupEventListeners();
    setupKeyboardShortcuts();
    updateViewMode();
    
    // 检查是否已有打开的笔记库
    try {
        const vaultPath = await window.notesAPI.getVaultPath();
        if (vaultPath) {
            await loadFileTree();
        }
    } catch (error) {
        console.error('获取笔记库路径时出错:', error);
    }
}

// 处理打开文件夹
async function handleOpenFolder(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    console.log('点击了打开文件夹按钮', e);
    console.log('window.notesAPI 存在:', !!window.notesAPI);
    console.log('window.notesAPI.selectFolder 存在:', !!window.notesAPI?.selectFolder);
    
    if (!window.notesAPI) {
        alert('API 未加载，请刷新页面');
        return false;
    }
    
    if (!window.notesAPI.selectFolder) {
        alert('selectFolder 方法不存在');
        return false;
    }
    
    try {
        await openFolder();
    } catch (error) {
        console.error('打开文件夹时出错:', error);
        console.error('错误堆栈:', error.stack);
        alert('打开文件夹失败: ' + (error.message || error));
    }
    return false;
}

// 处理打开文件
async function handleOpenFile(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    console.log('点击了打开文件按钮', e);
    console.log('window.notesAPI 存在:', !!window.notesAPI);
    console.log('window.notesAPI.openFile 存在:', !!window.notesAPI?.openFile);
    
    if (!window.notesAPI) {
        alert('API 未加载，请刷新页面');
        return false;
    }
    
    if (!window.notesAPI.openFile) {
        alert('openFile 方法不存在');
        return false;
    }
    
    try {
        await openMarkdownFile();
    } catch (error) {
        console.error('打开文件时出错:', error);
        console.error('错误堆栈:', error.stack);
        alert('打开文件失败: ' + (error.message || error));
    }
    return false;
}

// 设置事件监听器
function setupEventListeners() {
    if (openFolderBtn) {
        console.log('为 open-folder-btn 添加点击事件');
        // 移除所有现有的事件监听器
        const newFolderBtn = openFolderBtn.cloneNode(true);
        openFolderBtn.parentNode.replaceChild(newFolderBtn, openFolderBtn);
        openFolderBtn = newFolderBtn;
        
        // 添加多种事件绑定方式
        openFolderBtn.addEventListener('click', handleOpenFolder, true); // 使用捕获阶段
        openFolderBtn.addEventListener('click', handleOpenFolder, false); // 使用冒泡阶段
        openFolderBtn.onclick = handleOpenFolder;
        openFolderBtn.onmousedown = (e) => {
            console.log('文件夹按钮 mousedown 事件');
            e.preventDefault();
        };
    }
    
    if (openFileBtn) {
        console.log('为 open-file-btn 添加点击事件');
        // 移除所有现有的事件监听器
        const newFileBtn = openFileBtn.cloneNode(true);
        openFileBtn.parentNode.replaceChild(newFileBtn, openFileBtn);
        openFileBtn = newFileBtn;
        
        // 添加多种事件绑定方式
        openFileBtn.addEventListener('click', handleOpenFile, true); // 使用捕获阶段
        openFileBtn.addEventListener('click', handleOpenFile, false); // 使用冒泡阶段
        openFileBtn.onclick = handleOpenFile;
        openFileBtn.onmousedown = (e) => {
            console.log('文件按钮 mousedown 事件');
            e.preventDefault();
        };
    }
    
    // Markdown 实时预览
    if (markdownInput) {
        markdownInput.addEventListener('input', updatePreview);
        
        // 自动保存（防抖）
        let saveTimeout;
        markdownInput.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                if (currentFilePath || currentFileFullPath) {
                    autoSave();
                }
            }, 2000);
        });
    }
    
    // 分隔条拖拽
    if (divider) {
        divider.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
    }
}

// 键盘快捷键
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+S 保存
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            autoSave();
        }
        // Ctrl+B 切换视图
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            toggleViewMode();
        }
    });
}

// 打开文件夹
async function openFolder() {
    console.log('开始打开文件夹...');
    if (!window.notesAPI) {
        console.error('notesAPI 不可用');
        alert('API 未加载，请刷新页面');
        return;
    }
    
    try {
        console.log('调用 selectFolder API...');
        const folderPath = await window.notesAPI.selectFolder();
        console.log('API 返回的文件夹路径:', folderPath);
        
        if (folderPath) {
            console.log('加载文件树...');
            await loadFileTree();
            if (vaultName) {
                vaultName.textContent = folderPath.split(/[/\\]/).pop() || '笔记库';
            }
            console.log('文件夹打开成功');
        } else {
            console.log('用户取消了文件夹选择');
        }
    } catch (error) {
        console.error('打开文件夹错误:', error);
        alert('打开文件夹失败: ' + (error.message || error));
    }
}

// 加载文件树
async function loadFileTree() {
    fileTreeData = await window.notesAPI.getFiles();
    if (fileTreeData) {
        renderFileTree(fileTreeData);
    }
}

// 渲染文件树
function renderFileTree(items, container = fileTree) {
    container.innerHTML = '';
    
    if (!items || items.length === 0) {
        container.innerHTML = '<div class="empty-state">文件夹为空</div>';
        return;
    }
    
    items.forEach(item => {
        const treeItem = createTreeItem(item);
        container.appendChild(treeItem);
    });
}

// 创建树节点
function createTreeItem(item) {
    const div = document.createElement('div');
    div.className = `tree-item ${item.type} ${item.expanded ? 'expanded' : ''}`;
    div.dataset.path = item.path;
    
    const icon = document.createElement('span');
    icon.className = 'tree-item-icon';
    icon.textContent = item.type === 'folder' ? (item.expanded ? '📂' : '📁') : '📄';
    
    const name = document.createElement('span');
    name.className = 'tree-item-name';
    name.textContent = item.name;
    
    div.appendChild(icon);
    div.appendChild(name);
    
    if (item.type === 'folder') {
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFolder(item, div);
        });
        
        if (item.children && item.children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'tree-children';
            item.children.forEach(child => {
                childrenContainer.appendChild(createTreeItem(child));
            });
            div.appendChild(childrenContainer);
        }
    } else {
        div.addEventListener('click', () => {
            openFile(item.path);
        });
    }
    
    return div;
}

// 切换文件夹展开/收起
function toggleFolder(item, element) {
    item.expanded = !item.expanded;
    element.classList.toggle('expanded', item.expanded);
    
    const icon = element.querySelector('.tree-item-icon');
    icon.textContent = item.expanded ? '📂' : '📁';
}

// 打开文件（从文件树）
async function openFile(path) {
    currentFilePath = path;
    currentFileFullPath = null; // 清空单个文件路径
    filePath.textContent = path;
    
    // 更新活动状态
    document.querySelectorAll('.tree-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeItem = document.querySelector(`[data-path="${path}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
    
    // 读取文件内容
    const content = await window.notesAPI.readFile(path);
    if (content !== null) {
        markdownInput.value = content;
        updatePreview();
    }
}

// 打开单个Markdown文件
async function openMarkdownFile() {
    console.log('开始打开Markdown文件...');
    if (!window.notesAPI) {
        console.error('notesAPI 不可用');
        alert('API 未加载，请刷新页面');
        return;
    }
    
    try {
        console.log('调用 openFile API...');
        const fileData = await window.notesAPI.openFile();
        console.log('API 返回的文件数据:', fileData);
        
        if (fileData) {
            currentFileFullPath = fileData.path;
            currentFilePath = null; // 清空笔记库文件路径
            if (filePath) {
                filePath.textContent = fileData.path;
            }
            if (markdownInput) {
                markdownInput.value = fileData.content;
            }
            updatePreview();
            
            // 清空文件树选择
            document.querySelectorAll('.tree-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // 更新笔记库名称显示
            if (vaultName) {
                vaultName.textContent = '单个文件模式';
            }
            console.log('文件打开成功');
        } else {
            console.log('用户取消了文件选择');
        }
    } catch (error) {
        console.error('打开文件错误:', error);
        alert('打开文件失败: ' + (error.message || error));
    }
}

// 更新预览
function updatePreview() {
    const markdownText = markdownInput.value;
    const html = window.notesAPI.parseMarkdown(markdownText);
    markdownPreview.innerHTML = html;
}

// 自动保存
async function autoSave() {
    const content = markdownInput.value;
    
    // 如果是笔记库中的文件
    if (currentFilePath) {
        await window.notesAPI.saveFile(currentFilePath, content);
    }
    // 如果是单独打开的文件
    else if (currentFileFullPath) {
        await window.notesAPI.saveExternalFile(currentFileFullPath, content);
    }
}

// 切换视图模式
function toggleViewMode() {
    const modes = ['split', 'editor', 'preview'];
    const currentIndex = modes.indexOf(viewMode);
    viewMode = modes[(currentIndex + 1) % modes.length];
    updateViewMode();
}

// 更新视图模式
function updateViewMode() {
    editorContainer.className = 'editor-container';
    
    switch (viewMode) {
        case 'split':
            editorContainer.classList.add('split-view');
            if (divider) divider.style.display = 'block';
            break;
        case 'editor':
            editorContainer.classList.add('editor-only');
            if (divider) divider.style.display = 'none';
            break;
        case 'preview':
            editorContainer.classList.add('preview-only');
            if (divider) divider.style.display = 'none';
            break;
    }
}

// 分隔条拖拽
let startX = 0;
let startWidth = 0;

function startDrag(e) {
    if (viewMode !== 'split') return;
    isDragging = true;
    startX = e.clientX;
    const editorPane = document.getElementById('editor-pane');
    startWidth = editorPane.offsetWidth;
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
}

function drag(e) {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    const editorPane = document.getElementById('editor-pane');
    const newWidth = startWidth + deltaX;
    const containerWidth = editorContainer.offsetWidth;
    
    // 限制最小宽度
    if (newWidth > 200 && newWidth < containerWidth - 200) {
        const percentage = (newWidth / containerWidth) * 100;
        editorPane.style.flex = `0 0 ${percentage}%`;
    }
}

function stopDrag() {
    if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
    }
}

// 测试按钮是否可点击
function testButtons() {
    console.log('测试按钮状态...');
    const folderBtn = document.getElementById('open-folder-btn');
    const fileBtn = document.getElementById('open-file-btn');
    
    console.log('folderBtn:', folderBtn);
    console.log('fileBtn:', fileBtn);
    
    if (folderBtn) {
        console.log('folderBtn 样式:', window.getComputedStyle(folderBtn));
        console.log('folderBtn pointer-events:', window.getComputedStyle(folderBtn).pointerEvents);
    }
    if (fileBtn) {
        console.log('fileBtn 样式:', window.getComputedStyle(fileBtn));
        console.log('fileBtn pointer-events:', window.getComputedStyle(fileBtn).pointerEvents);
    }
}

// 启动应用 - 确保DOM加载完成
function startApp() {
    console.log('[renderer] 开始启动应用');
    console.log('[renderer] document.readyState:', document.readyState);
    console.log('[renderer] window 对象:', typeof window);
    console.log('[renderer] window.notesAPI 存在:', !!window.notesAPI);
    
    if (window.notesAPI) {
        console.log('[renderer] window.notesAPI 的方法:', Object.keys(window.notesAPI));
    }
    
    // 检查是否有其他方式访问 API
    console.log('[renderer] 检查 window 对象的所有属性:', Object.keys(window).filter(k => k.includes('note')));
    
    testButtons();
    
    // 稍微延迟一下，确保 preload 脚本已经执行
    setTimeout(() => {
        console.log('[renderer] 延迟后检查 window.notesAPI:', !!window.notesAPI);
        if (window.notesAPI) {
            console.log('[renderer] window.notesAPI 的方法:', Object.keys(window.notesAPI));
        }
        init();
    }, 500); // 增加延迟时间
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[renderer] DOM 加载完成');
        startApp();
    });
} else {
    console.log('[renderer] DOM 已就绪');
    startApp();
}
