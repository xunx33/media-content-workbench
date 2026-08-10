# 媒体发布工作台 — 快速审阅报告

> 仓库：`github.com/xunx33/media-content-workbench`
> 审阅时间：2026-08-10 ｜ 本地路径：`D:\Tencent\WBspace\2026-08-10-09-55-24`

## 项目概况
- **定位**：个人自媒体多平台日更管理工具 —— 4 短视频（抖音/快手/小红书/视频号）+ 6 文书平台（百家号/公众号/知乎/企鹅号/搜狐号/官网）每日发布登记 + 数据复盘 + AI 收录追踪。
- **技术栈**：纯静态前端（原生 JS，零依赖零构建）+ Node.js 内置模块本地文件服务（零依赖）。体量约 **4050 行 / 17 个源文件**。
- **当前 HEAD**：`c1c6d43 feat: PWA 集成与安全/导出修复`（最近 5 次提交均为安全/导出/PWA 修复，维护活跃）。

## 架构（分层清晰）
| 文件 | 职责 |
|---|---|
| `server.js` | Node 静态服务 + `/api/data/{key}` JSON 读写（tmp+rename 原子写） |
| `js/store.js` | 数据层：CONFIG、异步加载、每日任务生成、旧数据迁移、服务心跳 |
| `js/ui.js` | 弹窗/Toast/导航/通用工具（escapeHtml、safeUrl、formatNum） |
| `js/views/*.js` | 5 个页面：今日待办/内容登记/数据复盘/发布日历/发布总览 |
| `js/app.js` | 入口路由 + 等待 storeReady + Service Worker 注册 |
| `sw.js` | PWA：导航 network-first、静态 SWR、数据永远走网络不缓存 |
| `manifest.webmanifest` | 应用身份证（可安装到桌面/手机） |

## 运行时验证（已实跑）
- ✅ 12 个 JS 文件 `node --check` 全部通过
- ✅ 启动服务：`GET /` → 200；空数据 → `[]`；`POST` 写入 → OK；回读正确
- ✅ 安全护栏实测：`/data` 静态访问 → **403**；非法 JSON `POST` → **400**；路径穿越前缀校验 `__dirname` 生效
- ✅ 缓存破坏机制：HTML/JS 均带 `?v=` 版本号；SW 有 `CACHE` 版本常量

## 质量亮点
1. **安全扎实**：全局 `escapeHtml` 防 XSS、`safeUrl` 校验协议头、服务端禁 `/data` 裸曝、写入原子化防半截文件。
2. **PWA 完整落地**：可装成桌面/手机 App，断网降级到缓存壳，数据接口不缓存保证实时。
3. **健壮性细节**：服务心跳（每 5s + 切前台 + 渲染时主动 ping）、断服红色横幅、保存串行化防竞态、每日任务自动补齐、旧版数据迁移逻辑完善。

## 已统一（2026-08-10，以 index.html 为准）
1. **文案**：GitHub 仓库描述原为「5文书平台」→ 已改为「6文书平台」，与 index 副标题、config（百家号/公众号/知乎/企鹅号/搜狐号/官网）一致。
2. **主题色**：`manifest` 的 `theme_color` 本就与 index 同为 `#2563eb`；仅 `background_color` 是深蓝 `#0f172a` → 已改为 `#2563eb`，启动闪屏与状态栏统一为蓝色品牌色。

## 仍可改进（非阻塞）
1. **`render()` 未 `await ensureDailyTasks()`**：异步 fire-and-forget，首帧 tasks 可能未补齐（实际无害，展示走 contents 计算）——可改为 `await` 或首帧后再 ensure。
2. **`safeUrl()` 需确认是否仍被调用**：在已读文件里未见调用点，若完全闲置可删，若用于链接渲染则保留。
3. **无自动化测试**：纯前端手测，`data/` 运行时生成（已被 gitignore，符合预期）。

## 运行方式
```
node server.js        # 或双击 start.bat / 启动工作台.bat
# 访问 http://localhost:3000
```
改前端后**必须**同步升 `index.html` 的 `?v=` 版本号 + `sw.js` 的 `CACHE` 版本，否则用户拿到旧壳。

## 结论
工程纪律扎实的小型个人工具，安全与 PWA 都不是走过场，可直接使用。上面 1–2 是顺手能修的小瑕疵，其余为优化建议。
