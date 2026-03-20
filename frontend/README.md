# Web Serial Tool - 前端

基于 Web Serial API 的现代化串口调试工具，支持本地串口调试、远程协作、项目管理、测试库、Wiki等功能。

> 📝 **文档说明**: 本文档已根据实际代码实现更新，反映当前版本的实际功能。

**项目状态**: v1.0.0 | 整体完成度约 85% | 已具备完整可运行版本

## 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Zustand** - 状态管理
- **React Router v6** - 路由管理
- **Tailwind CSS** - 样式框架
- **Headless UI** - 无头组件库
- **Axios** - HTTP 客户端
- **react-window** - 虚拟滚动
- **react-i18next** - 国际化（支持中英文）
- **markdown-it** - Markdown 渲染（Wiki）
- **highlight.js** - 代码高亮

## 项目结构

```
frontend/
├── src/
│   ├── components/          # UI 组件
│   │   ├── Layout/          # 布局组件（导航栏、侧边栏）
│   │   ├── SerialDebugger/  # 串口调试组件
│   │   ├── TestLibrary/     # 测试库组件
│   │   ├── Admin/           # 管理员组件
│   │   └── common/          # 通用组件（Modal、Toast等）
│   ├── lib/                 # 核心库
│   │   ├── serial.ts        # Web Serial API 封装
│   │   ├── serialManager.ts # 串口管理器
│   │   ├── api.ts           # REST API 客户端
│   │   ├── adminApi.ts      # 管理员 API
│   │   ├── sessionClient.ts # 会话客户端
│   │   ├── bridgeClient.ts  # 桥接客户端
│   │   └── testExecutor.ts  # 测试执行器
│   ├── stores/              # Zustand 状态管理（9个 Store）
│   ├── pages/               # 页面组件
│   │   └── admin/            # 管理员子页面
│   ├── hooks/               # 自定义 Hooks
│   ├── utils/               # 工具函数
│   ├── types/               # TypeScript 类型定义
│   ├── locales/             # 国际化资源（中英文）
│   ├── styles/              # 样式文件
│   ├── i18n.ts              # 国际化配置
│   ├── App.tsx              # 应用入口
│   └── main.tsx             # React 入口
├── public/                  # 静态资源
│   └── wiki/                # Wiki 文档（Markdown 文件）
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env                      # 开发环境配置
└── .env.production          # 生产环境配置（可选）
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

应用将运行在 http://localhost:5173

### 构建生产版本

```bash
npm run build
```

### 代码检查

```bash
npm run lint
```

## 环境变量

### 环境变量文件说明

项目使用环境变量文件，Vite 会根据构建模式（mode）自动选择加载：

1. **`.env`** - 基础配置
   - 在所有模式下都会被加载
   - 包含所有环境共用的配置
   - 特定 mode 的文件会覆盖其中的同名变量

2. **`.env.production`** - 生产环境配置（可选）
   - 在生产构建（`npm run build`）时加载
   - 会覆盖 `.env` 中的同名变量
   - 如果不存在，将只使用 `.env` 中的配置

**加载顺序**（优先级从高到低）：
- `.env.production.local` > `.env.local` > `.env.production` > `.env`

**注意**：
- 所有 `.env*` 文件包含敏感信息，不应提交到版本控制
- Vite 会根据 `mode`（development/production）选择加载对应的环境变量文件
- 环境变量必须以 `VITE_` 前缀开头才能在客户端代码中访问

## 浏览器兼容性

Web Serial API 要求：

- ✅ **Chrome 89+**
- ✅ **Edge 89+**
- ❌ Firefox（不支持）
- ❌ Safari（不支持）

**注意**: 必须在 HTTPS 或 localhost 环境下使用。

## 更新 Wiki

Wiki 内容以 Markdown 文件形式存储在 `public/wiki/` 目录下，通过前端页面动态加载显示。

### Wiki 文件结构

```
public/wiki/
└── {分类}/
    ├── {slug}.md          # 文章内容（Markdown 格式）
    └── README.md          # 分类说明（可选）
```

### 更新现有文章

1. **编辑 Markdown 文件**
   - 找到对应的文章文件：`public/wiki/{分类}/{slug}.md`
   - 直接编辑 Markdown 内容
   - 支持标准 Markdown 语法和代码高亮

2. **重新构建应用**
   ```bash
   npm run build
   ```
   或开发模式下自动刷新（`npm run dev`）

### 添加新文章

1. **创建 Markdown 文件**
   - 在对应的分类目录下创建新文件：`public/wiki/{分类}/{slug}.md`
   - 文件名格式建议：`{序号}-{标题}.md`（如：`06-新功能说明.md`）

2. **在代码中注册文章**
   - 编辑 `src/pages/WikiPage.tsx`
   - 在 `WIKI_ARTICLES` 数组中添加新条目：
   ```typescript
   {
     id: '6',                    // 唯一 ID
     title: '新功能说明',         // 显示标题
     slug: '06-NewFeature',       // 文件名（不含扩展名）
     content: '',                 // 留空，会自动加载
     category: 'About',           // 分类名称（与 docs/09-wiki/ 目录结构对应）
     order: 6,                   // 排序序号
   }
   ```

3. **重新构建应用**
   ```bash
   npm run build
   ```

### 添加新分类

1. **创建分类目录**
   ```bash
   mkdir -p public/wiki/{新分类名称}
   ```

2. **更新代码中的分类**
   - 在 `WikiPage.tsx` 中，确保新分类的文章已添加到 `WIKI_ARTICLES` 数组
   - 分类名称会自动从文章数据中提取

### 注意事项

- **文件路径**：Markdown 文件必须放在 `public/wiki/` 目录下，构建时会被复制到 `dist/wiki/`
- **文件编码**：确保 Markdown 文件使用 UTF-8 编码
- **URL 编码**：分类名称和 slug 会在 URL 中自动编码，支持中文
- **代码高亮**：使用标准的 Markdown 代码块语法，会自动应用 highlight.js 高亮
- **开发模式**：开发模式下修改 Wiki 文件后，需要刷新浏览器页面才能看到更新
- **生产部署**：生产环境需要重新构建并部署才能看到 Wiki 更新

## 许可证

MIT

---


