# 📋 NextJS Todo App — Fullstack với PostgreSQL trên VPS

> Ứng dụng quản lý công việc (Todo) xây dựng bằng **Next.js App Router**, kết nối trực tiếp database PostgreSQL trên VPS, kèm **báo cáo tần suất công việc** theo ngày/tuần/tháng. Không cần backend riêng.

---

## 🏗️ Kiến trúc tổng quan

```
nextjs-todo/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Trang chính — danh sách todo
│   ├── report/
│   │   └── page.tsx            # Trang báo cáo tần suất
│   └── api/
│       ├── todos/
│       │   ├── route.ts        # GET (list) + POST (create)
│       │   └── [id]/
│       │       └── route.ts    # PUT (update) + DELETE
│       └── report/
│           └── route.ts        # GET báo cáo tần suất
├── lib/
│   └── db.ts                   # Kết nối PostgreSQL (pg pool)
├── components/
│   ├── TodoList.tsx
│   ├── TodoForm.tsx
│   └── ReportChart.tsx
├── .env.local                  # Biến môi trường (DB credentials)
└── package.json
```

---

## 🚀 Stack công nghệ

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| Framework | **Next.js 14+** (App Router) | SSR + API Routes tích hợp |
| Database | **PostgreSQL** (trên VPS) | Kết nối qua `pg` |
| ORM / Query | **`pg`** (node-postgres) | Không cần Prisma/Drizzle |
| Styling | **Tailwind CSS** | Utility-first |
| Biểu đồ | **Recharts** | Báo cáo tần suất |
| Deploy | **VPS** (PM2 + Nginx) | Chạy `next start` |

> ✅ **Không cần backend riêng** — Next.js API Routes (`/app/api/`) đóng vai trò REST API, gọi thẳng vào PostgreSQL.

---

## ⚙️ Cài đặt & Cấu hình

### 1. Clone & cài dependencies

```bash
npx create-next-app@latest nextjs-todo --typescript --tailwind --app
cd nextjs-todo
npm install pg recharts
npm install -D @types/pg
```

### 2. Cấu hình kết nối DB (`.env.local`)

```env
# Thông tin PostgreSQL trên VPS của bạn
POSTGRES_HOST=IP_VPS_CUA_BAN
POSTGRES_PORT=5432
POSTGRES_DB=todo_db
POSTGRES_USER=todo_user
POSTGRES_PASSWORD=mat_khau_cua_ban
```

### 3. Tạo Pool kết nối (`lib/db.ts`)

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: false, // Đổi thành { rejectUnauthorized: false } nếu dùng SSL
});

export default pool;
```

---

## 🗃️ Schema Database

```sql
-- Chạy trên PostgreSQL VPS của bạn

CREATE TABLE todos (
  id          SERIAL PRIMARY KEY,
  title       TEXT        NOT NULL,
  description TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending | in_progress | done
  priority    VARCHAR(10) DEFAULT 'medium',
    -- low | medium | high
  created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  due_date    DATE
);

-- Index để query báo cáo nhanh hơn
CREATE INDEX idx_todos_created_at ON todos(created_at);
CREATE INDEX idx_todos_status     ON todos(status);
```

---

## 📡 API Routes

### `GET /api/todos` — Lấy danh sách

```typescript
// app/api/todos/route.ts
import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const result = await pool.query(
    'SELECT * FROM todos ORDER BY created_at DESC'
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: Request) {
  const { title, description, priority, due_date } = await req.json();
  const result = await pool.query(
    `INSERT INTO todos (title, description, priority, due_date)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [title, description, priority ?? 'medium', due_date ?? null]
  );
  return NextResponse.json(result.rows[0], { status: 201 });
}
```

### `PUT /api/todos/[id]` — Cập nhật / hoàn thành

```typescript
// app/api/todos/[id]/route.ts
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { status, title, priority } = await req.json();
  const completedAt = status === 'done' ? 'NOW()' : 'NULL';

  const result = await pool.query(
    `UPDATE todos
     SET status=$1, title=COALESCE($2, title),
         priority=COALESCE($3, priority),
         completed_at = CASE WHEN $1='done' THEN NOW() ELSE NULL END
     WHERE id=$4 RETURNING *`,
    [status, title, priority, params.id]
  );
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await pool.query('DELETE FROM todos WHERE id=$1', [params.id]);
  return NextResponse.json({ success: true });
}
```

### `GET /api/report` — Báo cáo tần suất

```typescript
// app/api/report/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const range = searchParams.get('range') ?? 'week'; // day | week | month

  const groupBy: Record<string, string> = {
    day:   "DATE_TRUNC('hour',  created_at)",
    week:  "DATE_TRUNC('day',   created_at)",
    month: "DATE_TRUNC('week',  created_at)",
  };

  const since: Record<string, string> = {
    day:   "NOW() - INTERVAL '1 day'",
    week:  "NOW() - INTERVAL '7 days'",
    month: "NOW() - INTERVAL '30 days'",
  };

  const result = await pool.query(`
    SELECT
      ${groupBy[range]}  AS period,
      COUNT(*)           AS total,
      COUNT(*) FILTER (WHERE status = 'done') AS completed
    FROM todos
    WHERE created_at >= ${since[range]}
    GROUP BY period
    ORDER BY period ASC
  `);

  return NextResponse.json(result.rows);
}
```

---

## 📊 Báo cáo tần suất công việc

Trang `/report` hiển thị biểu đồ **Recharts** với các chỉ số:

- 📈 **Số task tạo mới** theo giờ / ngày / tuần
- ✅ **Số task hoàn thành** trong cùng kỳ
- 📉 **Tỉ lệ hoàn thành** (%)
- 🔥 **Ngày/giờ cao điểm** tạo task nhất

```tsx
// components/ReportChart.tsx (ví dụ)
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function ReportChart({ data }: { data: any[] }) {
  return (
    <BarChart width={700} height={350} data={data}>
      <XAxis dataKey="period" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="total"     name="Tổng task"      fill="#6366f1" />
      <Bar dataKey="completed" name="Đã hoàn thành"  fill="#22c55e" />
    </BarChart>
  );
}
```

---

## 🖥️ Tính năng chính

### ✅ Todo CRUD
- Thêm task với tiêu đề, mô tả, độ ưu tiên, hạn chót
- Đánh dấu hoàn thành / đang làm / chưa làm
- Xoá task
- Lọc theo trạng thái & ưu tiên

### 📊 Báo cáo tần suất
- Xem theo **ngày / tuần / tháng**
- Biểu đồ cột so sánh tạo mới vs hoàn thành
- Thống kê tỉ lệ hoàn thành (%)

---

## 🚢 Deploy lên VPS

### Chạy ứng dụng với PM2

```bash
# Build
npm run build

# Khởi động với PM2
npm install -g pm2
pm2 start npm --name "nextjs-todo" -- start
pm2 save
pm2 startup
```

### Cấu hình Nginx (reverse proxy)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Biến môi trường trên VPS

```bash
# Tạo file .env.local trên VPS (KHÔNG commit lên git)
nano /var/www/nextjs-todo/.env.local
```

---

## 📦 `package.json` — Dependencies cần thiết

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "pg": "^8.12.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "@types/pg": "^8.11.0",
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## 🔒 Lưu ý bảo mật

- ❌ **Không** commit `.env.local` lên Git → thêm vào `.gitignore`
- ✅ Giới hạn IP được phép kết nối PostgreSQL trong `pg_hba.conf` trên VPS
- ✅ Dùng user PostgreSQL riêng với quyền tối thiểu (chỉ SELECT/INSERT/UPDATE/DELETE trên `todo_db`)
- ✅ Bật tường lửa VPS, chỉ mở port 80/443/22

---

## 📌 Tóm tắt luồng hoạt động

```
Trình duyệt
    │
    ▼
Next.js (VPS :3000)
    ├── /           → Trang Todo (React Server Component + Client)
    ├── /report     → Trang báo cáo (fetch /api/report)
    └── /api/...    → API Routes (Node.js)
                          │
                          ▼
                    PostgreSQL (VPS :5432)
                    [Cùng VPS hoặc VPS riêng]
```

> 💡 **Tip**: Vì Next.js API Routes chạy server-side, kết nối PostgreSQL hoàn toàn **không lộ ra client** — an toàn và không cần middleware hay backend riêng.

---

