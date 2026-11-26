# focusboard

**把讨论变成一块板。** 和 agent 讨论方案时，让它把话画出来：板上只有扁平的矩形和线，agent 持续维护，人只负责看和说。

这个目录就是一个 **skill 包**：给 agent 的说明 + 一个单文件 CLI。自包含，不依赖 `node_modules`、不依赖仓库、不需要联网。

```
README.md            ← 你在读的这份（人读）
SKILL.md             ← 给 agent 的说明：三步、写板规则、判断
focusboard.mjs       ← 单文件 CLI，零依赖，node 20+
board.example.json   ← 最小板，复制它开始改
LICENSE              ← MIT
```

## 三步

```bash
cp board.example.json board.json                        # 1. 写板：{ tier, elements }
./focusboard.mjs check board.json --text                 # 2. 自查，画之前就该跑
./focusboard.mjs submit board.json --out out --page      # 3. 交付 out/board.svg
```

打开 `out/index.html` 就能看到板。

## 命令

```bash
./focusboard.mjs check  [file] [--text] [--free x,y,w,h] [--hit x,y]   # 只读，不写盘
./focusboard.mjs submit [file] [--out dir] [--page] [--text]           # 提交，写 SVG
```

- `file` 省略或写 `-` 就从 stdin 读整块板。
- **默认输出 JSON**，`--text` 切人读。
- `submit` 先 lint：**errors 非空就一个字节都不写**，上一版文件留着。
- 退出码：`0` 无 error / `1` lint 有 error / `2` 用法错。
- lint 查六件事：重复 id、悬空线、越界、框与框部分重叠、线穿过某个框、文字溢出。**线上谁、线线交叉、间距好不好看不查。**
- 框可以包住框：严格包含不报部分重叠，容器里的连线也不算穿过；没有父子，数组顺序就是 z 序，容器要写在子框前面。

## 给 agent 用

把整个目录放进 agent 的 skills 目录即可；或者把 `SKILL.md` 的内容当提示词，把 `focusboard.mjs` 当它唯一的工具。agent 读完 `SKILL.md` 就知道怎么画、怎么自查、什么时候该开新板。

## 来源

- 仓库：<https://github.com/fqmoon/focusboard>
- 版本与更新：<https://github.com/fqmoon/focusboard/releases>
- 设计记录：`docs/product.md`、`docs/tech.md`、`docs/roadmap.md`（在仓库里）

## License

MIT © 2026 [fqmoon](https://github.com/fqmoon)

<!-- version -->
