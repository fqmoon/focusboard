# focusboard

把讨论变成一块板：agent 持续维护一组扁平的矩形和线，人只负责看和说。

这个仓库是 SDK，不是服务。它只做两件事：

- `@focusboard/core`：唯一的 board schema、校验、几何查询、lint、字格与档位。
- `@focusboard/svg-render`：`toSVG(board)`，元素 + 档位 → SVG 字符串，不碰 DOM。

传输、页面更新、持久化都由调用方决定。

## 开发

```bash
npm install
npm test          # 编译并跑 core / svg-render / cli 的测试
npm run example   # 提交示例板 → examples/host/out/{board.svg,index.html}
npm run check     # 只读报告（人读）
npm run build:skill  # 产物：dist/skill/{SKILL.md,focusboard.mjs,board.example.json}
```

打开 `examples/host/out/index.html` 可以看到示例板（`board.json` 是运行流程图，`arch.json` 是架构图）。

## 产物：一个 skill 包

这套东西对使用者来说**表现为一个 skill**：agent 读 `SKILL.md` 就知道怎么画、怎么自查、什么时候该开新板；它需要的唯一工具是一个 148 KB 的单文件 CLI。

```bash
npm run build:skill
dist/skill/
  SKILL.md            # 给 agent 的说明：三步、写板规则、判断
  focusboard.mjs      # 单文件、零依赖、node 20+，check / submit 都在里面
  board.example.json  # 最小板，复制开始改
```

产物是自包含的：不依赖 `node_modules`、不依赖本仓库、不需要发布到 npm。整个目录丢给别人即可 ——

```bash
cp board.example.json board.json
./focusboard.mjs check board.json --text     # 画之前自查
./focusboard.mjs submit board.json --out out --page
```

仓库里的 `skill/` 是源（改说明改这里），`dist/` 是产物（不提交）。产物随 GitHub Release 发布，见 [Releases](https://github.com/fqmoon/focusboard/releases)。

## 命令：查与交

`@focusboard/cli` 给一个 `focusboard` 命令，两个动词：

```bash
focusboard check  [file] [--text] [--free x,y,w,h] [--hit x,y]   # 只读，不写盘
focusboard submit [file] [--out dir] [--page] [--text]           # 提交，写 SVG
```

- `file` 省略或写 `-` 就从 stdin 读整块板。
- **默认输出 JSON**（给机器读），`--text` 切人读。
- `submit` 默认只写 `board.svg`；`--page` 再写一个能直接打开的 `index.html`。
- `submit` 先 `lint`：**errors 非空就不写盘**，上一版文件留着，画坏一次不会毁掉当前板。
- 退出码：`0` 无 error / `1` lint 有 error / `2` 用法错。
- 元素 schema 只有一份，在 `core` 里；CLI 不重新定义任何形状。

```bash
$ focusboard submit board.json --out out
{ "errors": [], "warnings": [], "rendered": true, "wrote": [".../out/board.svg"] }

$ focusboard check board.json --free 17,10,15,9 --hit 24,12
{ "errors": [], "warnings": [],
  "free": [{ "x": 17, "y": 10, "w": 15, "h": 9, "cells": 37 }],
  "hit":  [{ "x": 24, "y": 12, "ids": ["tosvg"] }],
  "report": { ... }        // 每框的列宽明细，省篇幅从略
}
```

`check --text` 打的是同一份数据的文字版：每框 `capacity N 列 × M 行`、每行占几列、有没有被自动折行、哪些汉字偏半格。

查询也吃整块板：它问的是“你手里这一版”，所以提交之前就能问；宿主持有“上一版”会引入版本歧义。一次调用可以问多个点、多块区域。

## 用法

```js
import { lint } from '@focusboard/core';
import { toSVG } from '@focusboard/svg-render';

const board = { tier: 'medium', elements: [/* ... */] };

const { errors, warnings } = lint(board);
if (errors.length === 0) {
  const svg = toSVG(board);
  document.querySelector('#board').innerHTML = svg;
}
```

## 文档

设计记录在 [`docs/`](docs/)：产品、路线、技术。

## License

MIT
