import re, pathlib

path = pathlib.Path(r"c:\Users\JS\Documents\Codex\2026-06-03\github\outputs\notes-app\app.js")
c = path.read_text("utf-8")
lines = c.split("\n")
changes = []

for i, line in enumerate(lines):
    orig = line
    if ">No notes</div>" in line:
        line = line.replace(">No notes</div>", ">\u6682\u65e0\u7b14\u8bb0</div>")
    if 'data-tag="">All</span>' in line:
        line = line.replace('data-tag="">All</span>', 'data-tag="">\u5168\u90e8</span>')
    if "confirm(" in line and "return;" in line and "n.title" in line:
        line = '  if (!confirm("\u786e\u8ba4\u5220\u9664\u300c" + (n ? n.title || "\u65e0\u6807\u9898" : "") + "\u300d\uff1f")) return;'
    if "showStatus(" in line and "saveToGist" in line and "\u5df2" not in line and "Deleted" not in line:
        line = '  await saveToGist(); showStatus("\u5df2\u5220\u9664");'
    line = line.replace('showStatus("Saved")', 'showStatus("\u5df2\u4fdd\u5b58")')
    line = line.replace('showStatus("Synced")', 'showStatus("\u5df2\u540c\u6b65")')
    line = line.replace('showStatus("Deleted")', 'showStatus("\u5df2\u5220\u9664")')
    line = line.replace('"Saved " + now.getHours', '"\u5df2\u4fdd\u5b58 " + now.getHours')
    line = line.replace('previewBtn.title = "Edit"', 'previewBtn.title = "\u7f16\u8f91"')
    line = line.replace('previewBtn.title = "Preview"', 'previewBtn.title = "\u9884\u89c8"')
    line = line.replace('"Error: "', '"\u9519\u8bef: "')
    line = line.replace('"Enter a token"', '"\u8bf7\u8f93\u5165\u4ee4\u724c"')
    line = line.replace('"QuickNote notes"', '"\u5feb\u901f\u7b14\u8bb0\u6570\u636e"')
    line = line.replace('title: "Welcome"', 'title: "\u6b22\u8fce"')
    line = line.replace('content: "Notes sync across devices via GitHub Gist."', 'content: "\u7b14\u8bb0\u901a\u8fc7 GitHub Gist \u8de8\u8bbe\u5907\u540c\u6b65\u3002"')
    if line != orig:
        changes.append(str(i+1))
    lines[i] = line

c = "\n".join(lines)
path.write_text(c, "utf-8")
print(f"Fixed {len(changes)} lines: {', '.join(changes)}")