# sidecard

[English](README.md) · **简体中文** · [繁體中文](README_zht.md)

一个 Claude Code **模组（mod）**：把等待智能体干活的时间变成一张张小巧、用完即弃的学习卡片。卡片以带边框的形式显示在加载动画（spinner）下方，一旦 Claude 需要你介入或已经完成，卡片会立刻消失。

```
⠋ Thinking…
╭─ sidecard · french ───────────────╮
│ pourtant                          │
│ however / yet                     │
│                                   │
│ Il était fatigué, pourtant il a … │
│ ┄ answer in 4s ▰▰▱▱▱▱             │
╰───────────────────────────────────╯
```

卡片分两种：**只读**，或**延迟揭晓答案**（先倒计时，再显示答案）。

## 环境要求

- Claude Code **v2.1.287 或更高版本**（支持模组）。用 `claude --version` 查看。
- 卡片只在终端和桌面应用的 Code 标签页中显示（VS Code 聊天面板和 `claude -p` 不显示）。

## 安装

```text
/plugin marketplace add phunterlau/sidecard
/plugin install sidecard@sidecard
/reload-plugins
```

确认已加载：`/plugin` 会显示 `1 mod active · sidecard`。模组是以你的权限运行的代码，请先阅读 `hooks/register.ts`。`claude plugin validate .` 会列出它监听的所有事件和调用的所有接口。

## 使用

| 命令 | 作用 |
| --- | --- |
| `/sidecard` 或 `/sidecard menu` | 分类菜单：`✓`/`☐` 开关（快捷键 1–9），以及每个分类的参数下拉框 |
| `/sidecard now` | 立即显示一张卡片（回合进行中显示在 spinner 下方，空闲时显示在输入框上方） |
| `/sidecard on` / `off` | 启用或关闭所有卡片 |
| `/sidecard <category>` | 开关某个分类，例如 `/sidecard french` |
| `/sidecard <category> key=value` | 设置某个参数，例如 `/sidecard french level=B1` |
| `/sidecard generate on\|off` | 开启或关闭用 Claude Code 的 Haiku 生成新卡片 |
| `/sidecard reload` | 重新扫描分类文件 |
| `/sidecard status` | 查看当前设置 |

默认行为：回合开始 8 秒后出现卡片，停留 20 秒（有延迟答案的卡片更久），两张卡片之间至少间隔 45 秒。回合结束，或 Claude 请求权限或输入时，卡片消失。设置会跨会话保存。

### 卡片从哪里来

- **生成**：模组在后台调用 Claude Code 自带的 `haiku`（`$.model.complete`，低推理强度），每批生成 10 张卡片，缓存并避免重复。无需单独的 API 密钥，但会**消耗你的套餐或 API 额度**。可用 `/sidecard generate off` 关闭。
- **内置**：48 张离线卡片，覆盖 `french`、`python-advanced`、`ml-general` 和 `llm`，在第一批生成卡片到达前或关闭生成时使用。

## 分类与开发

卡片来自**分类（category）**，每个分类就是一个 Markdown 文件。内置分类位于 `categories/`：`french`、`python-advanced`、`ml-general`、`llm`。

只要文件出现在下面任一目录（包含一层子目录），新分类就会自动出现，所以你可以直接把分类包 `git clone` 到那里：

- 本插件的 `categories/`
- `~/.claude/sidecard/categories/`

文件会在会话开始、打开菜单以及执行 `/sidecard reload` 时被读取。

```markdown
---
name: french                 # 必填：小写字母、数字、- 或 _
title: French                # 菜单中的名称
color: cyan                  # cyan|green|magenta|yellow|blue|red|white
mode: delayed                # read | delayed
revealAfter: 6               # 答案出现前的秒数（仅 delayed）
model: haiku
input.level: A2 | A1, A2, B1, B2, C1, C2   # <默认值> | <可选项>
---
Teach practical French for a learner at CEFR level {{level}}.
Each card is a phrase with an example, or a recall prompt with the answer in "answer".
```

- `input.<key>: <默认值> | <可选项>` 会在菜单里增加一个下拉框。每个参数都必须有默认值。
- 正文中的 `{{key}}` 会替换为所选的值（或默认值）。
- 模组会要求模型返回由 `{"body", "answer"?}` 组成的 JSON 数组；你只需要写教学指令。
- 没有内置离线卡片的分类，需要开启生成才能使用。

### 参与贡献

欢迎贡献，尤其是新的分类和更好的卡片：

- **新增分类**：复制 `categories/` 里的一个文件，修改 frontmatter 和教学提示词，然后提交 Pull Request。适合的方向有其他语言、SQL、Shell、系统设计、算法、数学，或你自己的专业领域。
- **新增或改进离线卡片**：`hooks/cards.ts` 中的内置卡片会在第一批生成卡片到达前以及关闭生成时使用。
- **改进模组本身**：卡片排版在 `hooks/draw.ts`，分类解析在 `hooks/frontmatter.ts`，钩子、命令和菜单在 `hooks/register.ts`。

提交 Pull Request 前，请在仓库克隆目录中运行：

```bash
claude plugin validate .
claude plugin test .
claude --plugin-dir .      # 仅为本次会话加载该克隆，保存文件时自动重新加载钩子
```

凡是修改解析器或绘制逻辑，请在 `hooks/*.test.ts` 中补充测试。

## 许可证

MIT，见 `LICENSE`。
