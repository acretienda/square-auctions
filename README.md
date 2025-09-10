Square Auctions backend (updated)

What this package does:
- Creates 'admins' table automatically (if missing)
- Creates a default admin if table empty (DEFAULT_ADMIN_USER / DEFAULT_ADMIN_PASSWORD env vars)
- Provides POST /api/admin/login which returns JWT signed with JWT_SECRET env var
- Protect routes with middleware in middleware/auth.js

Deploy notes for Render:
1. Ensure DATABASE_URL is configured in Render (managed when you added DB)
2. Add JWT_SECRET in Environment => Settings on Render (you already did)
3. OPTIONAL: set DEFAULT_ADMIN_USER and DEFAULT_ADMIN_PASSWORD env vars if you prefer custom defaults
4. Push these files to your repo and trigger a deploy on Render
