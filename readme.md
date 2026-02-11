# Grok2API

> 面向 Cloudflare Workers 的 Grok2API，全面适配最新 Web 调用格式，支持流式对话、图像生成、图像编辑、联网搜索、深度思考，号池并发与自动负载均衡一体化。

## 技术栈

- **运行时**：Cloudflare Workers
- **框架**：Hono (轻量级 Web 框架)
- **数据库**：Cloudflare D1 (SQLite)
- **缓存**：Cloudflare KV
- **语言**：TypeScript

## 项目结构

```
grok2api/
├── src/
│   ├── index.ts           # 主入口
│   ├── routes/            # 路由模块
│   │   ├── openai.ts      # OpenAI 兼容接口
│   │   ├── admin.ts       # 管理后台接口
│   │   └── media.ts       # 媒体文件接口
│   ├── grok/              # Grok API 核心逻辑
│   ├── kv/                # KV 缓存管理
│   ├── repo/              # 数据库操作
│   └── utils/             # 工具函数
├── app/template/          # 前端静态资源
├── migrations/            # 数据库迁移文件
└── wrangler.toml          # Cloudflare Workers 配置
```

## 部署指南

### Cloudflare Workers / Pages 部署

### 一键部署（GitHub Actions，推荐）

只需要在 GitHub 仓库配置 2 个 Secrets，即可一键部署到 Cloudflare Workers（并自动创建/绑定 D1 + KV）：

1. Fork 本仓库
2. GitHub → Settings → Secrets and variables → Actions 添加：
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. push 到 `main`（或在 Actions 页面手动运行 `Deploy to Cloudflare Workers` 工作流）

工作流会自动：
- 创建/复用 D1 数据库（名称取自 `wrangler.toml` 的 `database_name`）
- 创建/复用 KV Namespace（名称默认为 `<worker_name>-cache`，即 `grok2api-cache`）
- 生成 `wrangler.ci.toml` 并执行 D1 migrations + 部署 Worker

### 手动部署

手动部署与更完整的说明请查看：`README.cloudflare.md`

### 本地开发

```bash
# 安装依赖
npm install

# 本地开发（需要先配置 wrangler.toml）
npm run dev

# 类型检查
npm run typecheck

# 部署到 Cloudflare Workers
npm run deploy

# 执行数据库迁移
npm run db:migrate
```

## 核心特性

### ⚡ Cloudflare 原生优势
- **零配置反爬**：基于 Cloudflare Workers 部署，天然绕过 Grok 的反爬机制
- **无需配置 `x_statsig_id` 或 `cf_clearance`**：Cloudflare 网络自带可信 IP，开箱即用
- **全球加速**：利用 Cloudflare 全球 CDN 网络，低延迟访问
- **免费额度**：Workers 每日 100,000 次请求免费

### 🚀 性能优化
- **全异步流式处理**：采用 `aiter_lines` 异步迭代，彻底解决管理面板在消息生成时的卡顿问题
- **并发负载均衡**：多 Token 自动轮询，智能分配请求
- **智能冷却机制**：
  - 普通错误：冷却 5 次请求
  - 429 限流 + 有额度：冷却 1 小时
  - 429 限流 + 无额度：冷却 10 小时

### 🔐 管理功能
- **多 Key 管理**：批量创建、备注、删除 API Key，支持多选操作
- **Token 管理**：批量添加/删除 Grok Token，支持标签分类和备注
- **一键刷新**：批量刷新所有 Token 剩余次数，实时进度显示
- **并发保护**：刷新任务进行中自动拒绝重复请求

### 📊 监控与审计
- **请求统计**：按小时/天统计请求趋势，包含成功率和模型分布图表
- **日志审计**：实时记录请求细节，支持持久化存储
- **缓存预览**：查看缓存的图片/视频内容
- **存储模式**：支持 D1 数据库持久化，重启不丢失数据

### 🎨 媒体处理
- **图像生成**：自动识别绘图请求，返回 Markdown 格式图片
- **视频生成**：支持 `grok-imagine-0.9` 模型，图生视频功能
- **智能缓存**：自动缓存图片/视频到 KV，绕过 Grok 403 限制
- **定时清理**：每日自动清理过期缓存（默认北京时间 00:00）

## 🆕 Fork 增强功能

本项目基于原版 grok2api 进行了全面重构和增强，主要改进包括：

- 采用 TypeScript + Hono 框架重写，代码结构更清晰
- 完整的 D1 数据库持久化支持
- 优化的异步流式处理，解决并发卡顿问题
- 增强的 Token 管理和智能冷却机制
- 完善的统计和审计功能

<br>

## 快速开始

### 1. 部署服务

参考上方的 [部署指南](#部署指南) 完成 Cloudflare Workers 部署。

### 2. 配置管理后台

1. 访问 `https://your-domain/login`
2. 使用默认账号登录（用户名/密码：`admin`/`admin`）
3. 进入管理后台，添加 Grok Token
4. 配置系统参数（可选）

### 3. 调用 API

```bash
curl https://your-domain/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "grok-4",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

## 功能说明

### 调用次数与配额

- **普通账号（Basic）**：免费使用 **80 次 / 20 小时**
- **Super 账号**：配额待定（作者未测）
- 系统自动负载均衡各账号调用次数，可在**管理页面**实时查看用量与状态

### 图像生成功能

- 在对话内容中输入如“给我画一个月亮”自动触发图片生成
- 每次以 **Markdown 格式返回两张图片**，共消耗 4 次额度
- **注意：Grok 的图片直链受 403 限制，系统自动缓存图片到 KV。必须正确设置 `Base Url` 以确保图片能正常显示！**

### 视频生成功能
- 选择 `grok-imagine-0.9` 模型，传入图片和提示词即可（方式和 OpenAI 的图片分析调用格式一致）
- 返回格式为 `<video src="{full_video_url}" controls="controls"></video>`
- **注意：Grok 的视频直链受 403 限制，系统自动缓存视频到 KV。必须正确设置 `Base Url` 以确保视频能正常显示！**

```
curl https://你的服务器地址/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GROK2API_API_KEY" \
  -d '{
    "model": "grok-imagine-0.9",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "让太阳升起来"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://your-image.jpg"
            }
          }
        ]
      }
    ]
  }'
```

### 关于 Cloudflare 部署的优势

**为什么选择 Cloudflare Workers？**

本项目专为 Cloudflare Workers 优化，相比传统 VPS 部署有以下优势：

1. **零配置反爬**：Cloudflare 网络的请求自带可信环境，无需配置 `x_statsig_id` 或 `cf_clearance`
2. **稳定性更高**：Grok 不会对 Cloudflare IP 进行限制，避免频繁更换代理
3. **全球加速**：利用 Cloudflare 全球 300+ 数据中心，就近访问
4. **成本更低**：Workers 免费额度每日 100,000 次请求，足够个人使用

**传统部署方式的问题**：
- ❌ 需要频繁更新 `x_statsig_id` 和 `cf_clearance`
- ❌ IP 容易被 Grok 识别和封禁
- ❌ 需要配置代理或使用浏览器自动化工具
- ❌ 维护成本高，稳定性差

**Cloudflare 部署**：
- ✅ 开箱即用，无需任何反爬配置
- ✅ 长期稳定，不会被封禁
- ✅ 部署简单，一键完成
- ✅ 免费额度充足

<br>

## API 接口

### OpenAI 兼容接口

> 与 OpenAI 官方接口完全兼容，API 请求需通过 **Authorization header** 认证

| 方法  | 端点                         | 描述                               | 认证 |
|-------|------------------------------|------------------------------------|------|
| POST  | `/v1/chat/completions`       | 创建聊天对话（流式/非流式）         | ✅   |
| GET   | `/v1/models`                 | 获取全部支持模型                   | ✅   |

### 媒体接口

| 方法  | 端点                         | 描述                               | 认证 |
|-------|------------------------------|------------------------------------|------|
| GET   | `/images/{img_path}`         | 获取生成图片文件                   | ❌   |
| GET   | `/videos/{video_path}`       | 获取生成视频文件                   | ❌   |

### 管理接口

| 方法  | 端点                    | 描述               | 认证 |
|-------|-------------------------|--------------------|------|
| GET   | `/login`                | 管理员登录页面     | ❌   |
| GET   | `/manage`               | 管理控制台页面     | ❌   |
| GET   | `/health`               | 健康检查接口       | ❌   |
| POST  | `/api/login`            | 管理员登录认证     | ❌   |
| POST  | `/api/logout`           | 管理员登出         | ✅   |

<details>
<summary>Token 管理接口（展开查看）</summary>

| 方法  | 端点                    | 描述               | 认证 |
|-------|-------------------------|--------------------|------|
| GET   | `/api/tokens`           | 获取 Token 列表    | ✅   |
| POST  | `/api/tokens/add`       | 批量添加 Token     | ✅   |
| POST  | `/api/tokens/delete`    | 批量删除 Token     | ✅   |
| POST  | `/api/tokens/tags`      | 更新 Token 标签     | ✅   |
| POST  | `/api/tokens/note`      | 更新 Token 备注     | ✅   |
| POST  | `/api/tokens/test`      | 测试 Token 可用性   | ✅   |
| POST  | `/api/tokens/refresh-all` | 一键刷新所有Token   | ✅   |
| GET   | `/api/tokens/refresh-progress` | 获取刷新进度       | ✅   |
| GET   | `/api/tokens/tags/all`  | 获取所有标签列表    | ✅   |

</details>

<details>
<summary>API Key 管理接口（展开查看）</summary>

| 方法  | 端点                    | 描述               | 认证 |
|-------|-------------------------|--------------------|------|
| GET   | `/api/keys`             | 获取 API Key 列表  | ✅   |
| POST  | `/api/keys/add`         | 创建新 API Key     | ✅   |
| POST  | `/api/keys/delete`      | 删除 API Key       | ✅   |
| POST  | `/api/keys/status`      | 切换 Key 启用状态  | ✅   |
| POST  | `/api/keys/name`        | 修改 Key 备注名称  | ✅   |

</details>

<details>
<summary>系统管理接口（展开查看）</summary>

| 方法  | 端点                    | 描述               | 认证 |
|-------|-------------------------|--------------------|------|
| GET   | `/api/settings`         | 获取系统配置       | ✅   |
| POST  | `/api/settings`         | 更新系统配置       | ✅   |
| GET   | `/api/stats`            | 获取统计信息       | ✅   |
| GET   | `/api/logs`             | 获取请求日志(1000条)| ✅   |
| POST  | `/api/logs/clear`       | 清空所有审计日志   | ✅   |
| GET   | `/api/storage/mode`     | 获取存储模式信息    | ✅   |

</details>

<details>
<summary>缓存管理接口（展开查看）</summary>

| 方法  | 端点                    | 描述               | 认证 |
|-------|-------------------------|--------------------|------|
| GET   | `/api/cache/size`       | 获取缓存大小       | ✅   |
| POST  | `/api/cache/clear`      | 清理所有缓存       | ✅   |
| POST  | `/api/cache/clear/images` | 清理图片缓存       | ✅   |
| POST  | `/api/cache/clear/videos` | 清理视频缓存       | ✅   |

</details>

<br>

## 可用模型

| 模型名称               | 计次   | 账户类型      | 图像生成 | 深度思考 | 联网搜索 | 视频生成 |
|------------------------|--------|--------------|----------|----------|----------|----------|
| `grok-4`               | 1      | Basic/Super  | ✅       | ✅       | ✅       | ❌       |
| `grok-4.1-thinking`    | 1      | Basic/Super  | ✅       | ✅       | ✅       | ❌       |
| `grok-4-fast`          | 1      | Basic/Super  | ✅       | ✅       | ✅       | ❌       |
| `grok-4-fast-expert`   | 4      | Basic/Super  | ✅       | ✅       | ✅       | ❌       |
| `grok-4-expert`        | 4      | Basic/Super  | ✅       | ✅       | ✅       | ❌       |
| `grok-4-heavy`         | 1      | Super        | ✅       | ✅       | ✅       | ❌       |
| `grok-3-fast`          | 1      | Basic/Super  | ✅       | ❌       | ✅       | ❌       |
| `grok-imagine-0.9`     | -      | Basic/Super  | ✅       | ❌       | ❌       | ✅       |

**配额说明**：
- **Basic 账号**：80 次 / 20 小时
- **Super 账号**：配额待测试

<br>

## 配置参数

> 登录管理后台 `/manage` 进行参数配置

### 全局配置

| 参数名                     | 必填 | 说明                                    | 默认值 |
|----------------------------|------|-----------------------------------------|--------|
| `admin_username`           | 否   | 管理后台登录用户名                      | "admin"|
| `admin_password`           | 否   | 管理后台登录密码                        | "admin"|
| `base_url`                 | 否   | 服务基础 URL（用于图片/视频访问）        | ""     |

### Grok 配置

| 参数名                     | 必填 | 说明                                    | 默认值 |
|----------------------------|------|-----------------------------------------|--------|
| `api_key`                  | 否   | API 密钥（可选加强安全）                | ""     |
| `x_statsig_id`             | 否   | 反机器人标识符（Cloudflare 部署无需配置）| 默认值 |
| `cf_clearance`             | 否   | Cloudflare 令牌（Cloudflare 部署无需配置）| ""     |
| `stream_chunk_timeout`     | 否   | 流式分块超时时间（秒）                   | 120    |
| `stream_first_response_timeout` | 否 | 流式首次响应超时时间（秒）              | 30     |
| `stream_total_timeout`     | 否   | 流式总超时时间（秒）                     | 600    |
| `filtered_tags`            | 否   | 过滤响应标签（逗号分隔）                | "xaiartifact,xai:tool_usage_card,grok:render" |
| `show_thinking`            | 否   | 显示思考过程 true/false                 | true   |
| `temporary`                | 否   | 会话模式 true(临时)/false               | true   |

**重要说明**：
- ✅ **Cloudflare Workers 部署无需配置 `x_statsig_id` 和 `cf_clearance`**
- 由于部署在 Cloudflare 网络上，请求自带可信 IP 和环境，Grok 会将其识别为正常流量
- 只有在非 Cloudflare 环境（如本地开发、VPS 部署）才需要配置这些参数
- 建议保持默认配置，开箱即用

<br>

## 注意事项

1. **图片/视频访问**：必须正确设置 `base_url` 参数，否则图片/视频无法正常显示
2. **Token 管理**：建议定期刷新 Token 剩余次数，避免使用已耗尽的 Token
3. **安全性**：部署后请立即修改默认管理员密码
4. **配额限制**：注意 Grok 账号的调用次数限制，系统会自动负载均衡
5. **学习用途**：本项目仅供学习与研究，请遵守相关使用条款

<br>

## 致谢

本项目基于以下项目学习重构，特别感谢：

- [LINUX DO](https://linux.do) - 社区支持
- [VeroFess/grok2api](https://github.com/VeroFess/grok2api) - 原始项目
- [xLmiler/grok2api_python](https://github.com/xLmiler/grok2api_python) - Python 实现参考
- [TQZHR/grok2api](https://github.com/TQZHR/grok2api) - 功能参考
- [chenyme/grok2api](https://github.com/chenyme/grok2api) - 优化参考

<br>

## License

MIT License
