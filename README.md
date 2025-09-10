Backend with admin management:

Endpoints:
- POST /api/admin/login { email, password } -> { token }
- GET /api/admin/ (protected) -> list admins
- POST /api/admin/ (protected) { email, password } -> create admin
- DELETE /api/admin/:id (protected) -> delete admin

Env vars:
- DATABASE_URL (Render DB)
- JWT_SECRET
- DEFAULT_ADMIN_USER (optional)
- DEFAULT_ADMIN_PASSWORD (optional)
