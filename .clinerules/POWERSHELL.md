# PowerShell 命令链

## 血泪教训

PowerShell **不支持** `&&` 语句分隔符，这是无数次翻车的源头。

| 场景 | 错误写法（PS 报错） | 正确写法 |
|------|--------------------|---------|
| 本地命令链 | `git add . && git commit -m "msg"` | `cmd /c "git add . && git commit -m "msg""` |
| 带路径切换 | `cd /d D:\xxx && npm run build` | `cmd /c "cd /d D:\xxx && npm run build"` |
| git push | `git add . && git commit && git push` | `cmd /c "git add . && git commit -m "msg" && git push"` |

## 两条路

**方案 A（推荐）**：套 `cmd /c`
```
cmd /c "cd /d %CD% && cmd1 && cmd2 && cmd3"
```
- 能继续用 `&&`，直觉友好
- `%CD%` 保持当前目录，不用硬编码路径

**方案 B**：纯 PS 语法用 `;`
```
cmd1; cmd2; cmd3
```
- 缺点：第二条命令即使失败也会继续跑，没有短路语义

## 规则

> **所有涉及多条命令的执行，一律先检查是否在 PowerShell 环境下。如果是，必须套 `cmd /c` 或改用 `;`，绝不允许裸用 `&&`。**

（这行的代价是反复被骂才写下来的，别再犯。）