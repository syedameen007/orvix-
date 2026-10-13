# Security policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Email the maintainers privately (add your security contact address here) with steps to reproduce. We aim to acknowledge reports within 3 working days.

## What is already in place

- Passwords hashed with bcrypt (cost configurable, default 12); 10+ characters with a letter and a number.
- Server-side sessions: JWTs are bound to a revocable session record whose token hash is stored, not the token.
- Login timing is equalised so response time does not reveal whether an email exists.
- Rate limits: 300 requests/minute per IP overall, 20 login attempts per 15 minutes, 15 sign-ups per hour.
- Strict CORS allow-list in production (`CORS_ORIGINS`); `helmet` security headers; request body size limits.
- The API refuses to start in production without a real `JWT_SECRET` and `DATABASE_URL`.
- Every record is scoped to the owning user; admin routes require the `ADMIN` role and are audit-logged.
- Users can change their password (signs out other devices), export their data, and delete their account from the app.

## Before going live

- [ ] Set a unique `JWT_SECRET` (`openssl rand -base64 48`) and a managed MongoDB with auth and backups.
- [ ] Set `CORS_ORIGINS` to your real domains only.
- [ ] Change the seeded admin password immediately; use a unique password and restrict who has the role.
- [ ] Serve everything over HTTPS only.
- [ ] Consider moving the session token from `localStorage` to an `HttpOnly` cookie (or secure native storage in the store apps) to reduce XSS exposure.
- [ ] Add email verification and password reset once an email provider is chosen.
