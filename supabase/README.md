# Supabase setup

## 1. Tạo project & lấy keys

- Vào [Supabase](https://supabase.com) → New project.
- Trong **Settings → API**: copy `Project URL` và `anon` key.
- Tạo file `.env.local` trong project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 2. Chạy migration (tạo bảng)

- Supabase Dashboard → **SQL Editor** → **New query**.

**Lần đầu:** chạy toàn bộ nội dung file `migrations/001_init.sql`.

**Nếu gặp lỗi "Could not find the 'logged_at' column":** chạy tiếp `migrations/002_ensure_logged_at.sql`.

Sau đó thử lại chức năng **Save to Log** và các trang Dashboard / Log.
