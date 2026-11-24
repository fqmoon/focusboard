# focusboard

把讨论变成一块板：agent 持续维护一组扁平的矩形和线，人只负责看和说。

这个仓库是 SDK，不是服务。它只做两件事：

- `@focusboard/core`：唯一的 board schema、校验、几何查询、lint、字格与档位。
- `@focusboard/svg-render`：`toSVG(board)`，元素 + 档位 → SVG 字符串，不碰 DOM。

传输、页面更新、持久化都由调用方决定。

## 开发

```bash
npm install
npm test          # 编译并跑 core / svg-render 的测试
npm run example   # board.json → examples/host/out/{board.svg,index.html}
npm run check     # 只读报告：每个框占了几列 / 几行 / 哪里汉字偏半格
npm run check -- board.json --free 17,10,15,9 --hit 24,12   # 单次批量查询
```

打开 `examples/host/out/index.html` 可以看到示例板。

## 提交：回执就是 lint

`npm run example` 的 stdout 只有 JSON，这就是全部契约：

```json
{ "errors": [], "warnings": [], "rendered": true, "wrote": ["...board.svg", "...index.html"] }
```

- 板先写盘、再 `lint`；**errors 非空就不渲染**，页面留着上一版，画坏一次不会毁掉当前板。
- 元素 schema 只有一份，在 `core` 里；这里不重新定义任何形状。
- 板怎么送到这（文件、HTTP、粘贴）、回执怎么回到 agent（stdout、工具返回、日志），都是调用方的事，SDK 不规定。

## 查询

查询也吃整块板：它问的是“你手里这一版”，所以要在提交之前就能问；宿主持有“上一版”会引入版本歧义。一次调用可以问多个点、多块区域：

```bash
npm run check -- board.json --free 17,10,15,9 --free 1,22,14,5 --hit 24,12
```

```json
{
  "errors": [], "warnings": [],
  "free": [{ "x": 17, "y": 10, "w": 15, "h": 9, "cells": 37 }],
  "hit":  [{ "x": 24, "y": 12, "ids": ["tosvg"] }]
}
```

不带查询参数时，同一个命令打印文字容量报告。两者都只读，都不动盘。

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
