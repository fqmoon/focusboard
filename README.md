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
```

打开 `examples/host/out/index.html` 可以看到示例板。

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
