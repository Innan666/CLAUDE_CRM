# 数据库配置指南

## 方式1: Supabase (推荐 - 免费)

1. 访问 https://supabase.com 注册账号
2. 创建新项目 (New project)
3. 等待项目创建完成（约1分钟）
4. 进入 **Settings** -> **Database**
5. 复制 **Connection string** (URI格式)
6. 替换 `.env` 文件中的 `DATABASE_URL`

示例连接字符串：
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxx.supabase.co:5432/postgres
```

## 方式2: 本地 PostgreSQL

1. 下载安装 PostgreSQL: https://www.postgresql.org/download/windows/
2. 安装时设置密码为: `postgres`
3. 创建数据库 `salesflow`
4. 修改 `.env`:
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/salesflow"
   ```

## 启动项目

配置好数据库后，运行：

```bash
# 推送数据库结构
npm run db:push

# 填充演示数据
npm run db:seed

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000
