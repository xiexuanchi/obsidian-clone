# Obsidian Clone

一个仿照 Obsidian 的 Markdown 笔记软件，使用 Electron 开发。

## 功能特性

- 📁 **笔记库管理**：支持打开和管理整个笔记库文件夹
- 📄 **单文件编辑**：支持打开和编辑单个 Markdown 文件
- 🌳 **文件树浏览**：侧边栏显示笔记库的文件树结构
- ✏️ **双栏编辑器**：左侧编辑 Markdown 源码，右侧实时预览
- 💾 **文件操作**：支持创建、保存、删除 Markdown 文件
- 🎨 **Markdown 支持**：完整的 Markdown 语法支持（标题、列表、代码块、链接、图片、粗体、斜体等）

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **Marked** - Markdown 解析库
- **HTML/CSS/JavaScript** - 前端界面

## 安装

### 开发环境

1. 克隆项目：
```bash
git clone <repository-url>
cd obsidian-clone
```

2. 安装依赖：
```bash
npm install
```

3. 运行应用：
```bash
npm start
# 或
npm run dev
```

### 构建应用

构建 Windows 安装包：
```bash
npm run build:win
```

构建完成后，安装包位于 `dist` 目录。

## 使用方法

1. **打开笔记库**：
   - 点击侧边栏的 📁 按钮
   - 选择一个包含 Markdown 文件的文件夹
   - 文件树将显示该文件夹中的所有 `.md` 文件

2. **打开单个文件**：
   - 点击侧边栏的 📄 按钮
   - 选择一个 Markdown 文件进行编辑

3. **编辑笔记**：
   - 在左侧编辑器中输入 Markdown 内容
   - 右侧会实时显示渲染后的预览效果
   - 可以拖动中间的分隔线调整左右栏宽度

4. **文件操作**：
   - 在文件树中点击文件即可打开编辑
   - 编辑后自动保存（或使用快捷键保存）
   - 支持创建新文件和删除文件

## 项目结构

```
obsidian-clone/
├── main.js          # Electron 主进程
├── preload.js       # 预加载脚本
├── renderer.js      # 渲染进程逻辑
├── index.html       # 主界面
├── styles.css       # 样式文件
├── package.json     # 项目配置
└── dist/            # 构建输出目录
```

## 开发说明

- 主进程（`main.js`）：处理文件系统操作、窗口管理等
- 渲染进程（`renderer.js`）：处理 UI 交互和 Markdown 渲染
- 预加载脚本（`preload.js`）：在主进程和渲染进程之间建立安全的通信桥梁

## 许可证

MIT License

## 作者

本项目由社区开发维护。

