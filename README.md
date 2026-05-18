# SalesFlow AI - 销售项目财务一体化管理系统

B2B SaaS CRM系统，支持多租户数据隔离。

## 功能特性

- **多租户架构**：基于团队的数据隔离
- **RBAC角色**：管理员、销售、项目经理、财务
- **客户管理**：客户信息、联系人、商机、合同管理
- **商机管理**：Kanban看板，支持拖拽阶段变更
- **合同管理**：合同签署、收款计划、发票管理
- **项目管理**：Kanban看板、任务、里程碑
- **日历拜访**：FullCalendar日历、今日待办、拜访闭环
- **财务管理**：发票管理、回款管理、逾期预警
- **统计报表**：拜访趋势、类型分布、转化率分析

## 技术栈

- Next.js 15+ (App Router)
- TypeScript
- Prisma ORM + PostgreSQL
- Tailwind CSS + shadcn/ui
- FullCalendar
- NextAuth.js
- Recharts

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，修改数据库连接：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/salesflow?schema=public"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. 初始化数据库

```bash
# 生成 Prisma Client
npm run db:generate

# 推送数据库表结构
npm run db:push

# 填充演示数据（可选）
npm run db:seed
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 5. 局域网访问配置

项目已配置允许局域网其他设备访问。启动后：

1. 在本机浏览器访问 `http://localhost:3000` 确认正常
2. 查找本机局域网 IP 地址：
   - Windows: 运行 `ipconfig`，查看 IPv4 地址（如 `192.168.1.xxx`）
3. 在其他电脑浏览器访问 `http://192.168.1.xxx:3000`

**注意：** 确保防火墙允许 3000 端口的入站连接。

**停止开发服务器（Windows）：**
```bash
taskkill /F /IM node.exe
```

## 测试账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@demo.com | password123 |
| 销售 | sales@demo.com | password123 |
| 项目经理 | pm@demo.com | password123 |
| 财务 | finance@demo.com | password123 |

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── dashboard/          # 仪表盘页面
│   └── login/              # 登录页面
├── components/
│   ├── layout/             # 布局组件
│   └── ui/                 # UI 组件
└── lib/                    # 工具库
    ├── auth.ts             # NextAuth 配置
    ├── prisma.ts           # Prisma 客户端
    └── utils.ts            # 通用工具
```

## 部署

### Vercel + Supabase

1. 创建 Supabase PostgreSQL 数据库
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署

## License

MIT
