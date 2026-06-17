# QuickNote 📝

一个简洁优雅的在线笔记应用，使用纯 HTML/CSS/JavaScript 构建，无需后端服务器。

## 功能特性

- 📝 创建、编辑、删除笔记
- 🔍 全文搜索（标题、内容、标签）
- 🏷️ 标签分类管理
- ✨ **增强 Markdown 预览**
- 🌙 暗色/亮色主题切换
- 💾 自动保存（localStorage）
- ⌨️ 快捷键支持
- 📱 响应式设计，支持移动端
- 📎 附件上传（图片 / 文档，存储到 GitHub Repo）

## Markdown 支持

### 基础文本
- **标题**: `# H1` `## H2` `### H3`
- **样式**: `**粗体**` `*斜体*` `***粗斜体***` `~~删除线~~`
- **链接与图片**: `[文字](url)` `![替代](url)`
- **分割线**: `---`

### 代码与公式
- **行内代码**: `` `code` ``
- **代码块**: 三个反引号 + 语言名，支持语法高亮（JS / Python / C++ ...）
- **数学公式**: `$$...$$` 块级、`$...$` 内联（KaTeX 渲染）

### 块级元素
- **引用**: 行首 `>`，支持连续多行
- **表格**: `| 列1 | 列2 |` 标准 Markdown 表格（表头 + 斑马纹）
- **列表**: `- 项` 无序列表、`- [ ]` 待办、`- [x]` 已完成
- **思维导图**: 三个反引号 + `mindmap`（Markmap 渲染）

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + N` | 新建笔记 |
| `Ctrl + S` | 手动保存 |
| `Ctrl + P` | 切换预览 |
| `Ctrl + Shift + N` | 新建笔记 |
| `Ctrl + Shift + S` | 手动保存 |
| `Ctrl + Shift + P` | 切换预览 |
| `拖拽文件到页面` | 导入 TXT / DOCX / XLSX / CSV / MD |
| `点击 📎 按钮` | 上传附件（图片 / 文档） |

## 技术栈

- HTML5
- CSS3 (CSS Variables for theming)
- Vanilla JavaScript
- [Highlight.js](https://highlightjs.org/) — 代码语法高亮
- [KaTeX](https://katex.org/) — 数学公式渲染
- [Markmap](https://markmap.js.org/) — 思维导图渲染
- [Mammoth.js](https://github.com/mwilliamson/mammoth.js) — DOCX 导入
- [SheetJS](https://sheetjs.com/) — Excel 导入
- localStorage / GitHub Gist — 数据持久化与多端同步
- GitHub Pages — 托管

## 使用方法

直接打开 `index.html` 即可使用，数据保存在浏览器本地。

### 附件功能配置

1. 点击 sidebar 底部的齿轮图标
2. 输入附件存储 Repo（格式：`owner/repo`，如 `username/quicknote-files`）
3. 确保 GitHub Token 具有 `repo` 权限（附件通过 GitHub Contents API 上传）
4. 图片附件会自动插入 Markdown 引用，预览模式下直接显示

## 在线访问

访问 [GitHub Pages](https://qq398768650.github.io/quicknote/) 查看在线版本。

## License

MIT
