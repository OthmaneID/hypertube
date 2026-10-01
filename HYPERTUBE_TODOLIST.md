# Hypertube — Project TODO

> Last updated: 2026-09-30  
> Cross-referenced against the subject PDF (v7.1) and the actual codebase.

---

## Legend
| Symbol | Meaning |
|--------|---------|
| ✅ | Done and working |
| 🟡 | Partially done / needs polish |
| ❌ | Not started |

---

## 1. User Interface & Authentication

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 1.1 | Register: email, username, first_name, last_name, password | ✅ | Register.tsx + /auth/register |
| 1.2 | Password hashed (bcrypt) | ✅ | utils/auth.py |
| 1.3 | OAuth — 42 strategy | ✅ | /auth/redirect/42 + /auth/42 |
| 1.4 | OAuth — Google strategy | ✅ | /auth/google |
| 1.5 | Login with username + password | ✅ | /auth/login |
| 1.6 | Forgot password (email reset link) | ✅ | /auth/forgot-password + email service |
| 1.7 | Reset password via token | ✅ | /auth/reset-password |
| 1.8 | Logout from any page (one click) | ✅ | /auth/logout + sidebar button |
| 1.9 | Preferred language field (defaults to English) | 🟡 | Model has preferred_language; no UI switcher yet |
| 1.10 | Edit email, profile picture, user info (settings page) | ❌ | Settings.tsx is a placeholder; PATCH /user/me exists but UI is missing |
| 1.11 | Profile picture upload | ❌ | Backend route stub exists, no upload logic or UI |
| 1.12 | View other user public profile (picture + info, email hidden) | ❌ | Profile.tsx is a placeholder; no GET /user/:username route |
| 1.13 | /profile/:username route wired in frontend | ❌ | Route defined as /profile only (no param) |

1. [*] Add missing fields to User model (first_name, last_name, preferred_language)
2. [*] Update database schema migration for new user fields
3. [*] Update UserCreate/UserResponse schemas with new fields
4. [*] Update registration form to include first_name, last_name
5. [*] Add SMTP configuration to .env file
6. [*] Create password reset service with email sending
7. [*] Add POST /auth/forgot-password endpoint
8. [*] Add POST /auth/reset-password endpoint
9. [*] Add frontend password reset form
10. [*] Implement PATCH /user/me endpoint for profile updates
11. [*] Add profile picture upload functionality
12. [ ] Implement GET /user/:id endpoint for viewing other profiles
13. [ ] Ensure email is private in other users' profile views
14. [*] Create frontend profile page with edit functionality
15. [ ] Add email verification step during registration (send verification email with token)
---

## 2. Library (Movies & Series pages)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 2.1 | Auth-protected library section | ✅ | ProtectedRoute wraps /movies, /series |
| 2.2 | Search field on library pages | ❌ | No search input exists yet |
| 2.3 | Search queries 2+ external royalty-free sources | ❌ | Only TMDB (commercial) used; need archive.org or legittorrents |
| 2.4 | Results displayed as thumbnails sorted by name | ❌ | Depends on search (2.2/2.3) |
| 2.5 | Default view: most popular videos | ✅ | TMDB popular endpoint used |
| 2.6 | Thumbnail shows: title, production year | 🟡 | Title shown; year missing on Card.tsx |
| 2.7 | Thumbnail shows: IMDb/TMDb rating | 🟡 | Vote stored but not shown on card |
| 2.8 | Thumbnail shows: cover image | ✅ | Poster image rendered |
| 2.9 | Watched / unwatched visual differentiation on cards | ❌ | History model exists; no UI badge |
| 2.10 | Infinite scroll pagination (no load-more button) | ✅ | IntersectionObserver approach |
| 2.11 | Sorting: name, genre, rating, year | ❌ | No sort controls |
| 2.12 | Filtering: genre, rating range, year range | ❌ | No filter controls |

---

## 3. Video / Movie Detail Page

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 3.1 | Detail page: title, summary, year, runtime, rating, poster | ✅ | MovieDetails.tsx / SerieDetails.tsx |
| 3.2 | Casting: director, producer, main cast | ✅ | Cast + crew scrollable rows |
| 3.3 | Comments section on movie/series page | ✅ | Comments.tsx sidebar |
| 3.4 | Post a comment | ✅ | Comment form + NSFW check |
| 3.5 | Torrent search -> launch download on server | ❌ | StreamingOptions shows mock data only |
| 3.6 | Stream video as it downloads (chunked / byte-range) | ❌ | No torrent or streaming backend |
| 3.7 | Non-blocking background torrent download | ❌ | |
| 3.8 | Persist downloaded movie; serve from disk on re-watch | ❌ | |
| 3.9 | Auto-delete movie if unwatched for 1 month | ❌ | Cron/scheduler not implemented |
| 3.10 | English subtitles auto-downloaded when available | ❌ | |
| 3.11 | Subtitles in user preferred language if available | ❌ | |
| 3.12 | Subtitle selector in video player | ❌ | |
| 3.13 | On-the-fly transcoding for non-native formats (mkv -> mp4/webm min.) | ❌ | FFmpeg not integrated |
| 3.14 | Video player embedded in the site | ❌ | Player component does not exist yet |
| 3.15 | Mark movie as watched in History after viewing | ❌ | Model exists; no trigger |

---

## 4. RESTful API (with OAuth2)

> Subject requires a separate RESTful API with OAuth2 Bearer token auth.
> Currently all routes use session-cookie auth and no /api prefix.

| # | Endpoint | Status | Notes |
|---|----------|--------|-------|
| 4.1 | POST /api/oauth/token — issue Bearer token (client + secret) | ❌ | |
| 4.2 | OAuth2 Bearer middleware for /api/* routes | ❌ | |
| 4.3 | GET /api/users — list (id + username) | ❌ | |
| 4.4 | GET /api/users/:id — username + avatar (no email unless self) | ❌ | |
| 4.5 | PATCH /api/users/:id — update own profile only; 403 for others | ❌ | |
| 4.6 | GET /api/movies — frontpage movies (id + name) | ❌ | |
| 4.7 | GET /api/movies/:id — name, id, rating, year, length, subtitles, comment count | ❌ | |
| 4.8 | GET /api/comments — latest comments (author, date, content, id) | ❌ | |
| 4.9 | GET /api/comments/:id — single comment | ❌ | |
| 4.10 | PATCH /api/comments/:id — edit comment (own only) | ❌ | |
| 4.11 | DELETE /api/comments/:id | ❌ | |
| 4.12 | POST /api/comments OR POST /api/movies/:movie_id/comments | ❌ | |
| 4.13 | Any other API call returns appropriate HTTP error code | ❌ | |

---

## 5. Security (Eliminatory Items)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 5.1 | No plain-text passwords in DB | ✅ | bcrypt throughout |
| 5.2 | SQL injection protection (ORM parameterized queries) | ✅ | SQLAlchemy ORM used |
| 5.3 | XSS protection (no raw HTML injection of user input) | 🟡 | React escapes by default; verify no dangerouslySetInnerHTML |
| 5.4 | Form validation — frontend | 🟡 | Register/login have some; Settings/profile forms missing |
| 5.5 | Form validation — backend (Pydantic) | 🟡 | Schemas exist; comment content not length-validated |
| 5.6 | CSRF protection | ❌ | No CSRF tokens; cookies are httponly but no double-submit |
| 5.7 | Profile picture upload validation (type + size) | ❌ | Not implemented |
| 5.8 | Rate limiting on auth endpoints | ❌ | |
| 5.9 | Security headers (CSP, X-Frame-Options, X-Content-Type) | ❌ | |
| 5.10 | .env excluded from git | ✅ | In .gitignore |
| 5.11 | No hardcoded credentials in source code | ✅ | All via config.py / settings |

---

## 6. Frontend / Responsive Design

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 6.1 | Mobile-usable layout | 🟡 | Basic responsiveness exists; needs audit |
| 6.2 | Header present | ✅ | Sidebar acts as nav |
| 6.3 | Footer present | ❌ | No footer component anywhere |
| 6.4 | Sidebar / nav accessible on mobile | 🟡 | Sidebar collapses but needs testing |
| 6.5 | Comments delete button accessible on mobile (three-dot menu) | ✅ | Fixed in latest update |
| 6.6 | Delete confirmation dialog on all screen sizes | ✅ | Fixed in latest update |
| 6.7 | Touch targets >= 44px | 🟡 | Not audited |
| 6.8 | Works on latest Chrome AND Firefox | 🟡 | Not tested cross-browser |
| 6.9 | No console errors or warnings | ❌ | Not audited — eliminatory rule |

---

## 7. Internationalization (i18n)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 7.1 | User can select preferred language (defaults EN) | ❌ | DB field exists; no UI |
| 7.2 | UI strings translated (at least EN + 1 other) | ❌ | No i18n library integrated |
| 7.3 | Language auto-detected from browser | ❌ | |

---

## 8. Quality / Eliminatory Rules

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 8.1 | Zero server-side errors/warnings in logs | 🟡 | Debug print statements remain |
| 8.2 | Zero browser console errors/warnings | ❌ | Not audited — eliminatory |
| 8.3 | Compatible with Chrome (latest) | 🟡 | Not formally tested |
| 8.4 | Compatible with Firefox (latest) | 🟡 | Not formally tested |
| 8.5 | All async operations have loading states | 🟡 | Movie lists have spinners; profile/settings do not |

---

## Recommended Execution Order

```
Phase 1 — User profiles & settings UI       (1.9–1.13)
Phase 2 — Library: search, cards, filters   (2.2–2.12)
Phase 3 — Torrent + Video streaming         (3.5–3.15)  <- hardest / most time
Phase 4 — RESTful API with OAuth2           (4.1–4.13)
Phase 5 — Security hardening               (5.3–5.9)
Phase 6 — Frontend polish & responsive     (6.1–6.9)
Phase 7 — i18n                              (7.1–7.3)
Phase 8 — Final QA (zero console errors)   (8.1–8.5)
```

---

## CRITICAL / Eliminatory Risks

> These will give an automatic 0 if not fixed before evaluation:

1. Zero console errors — run full DevTools audit before defense
2. Torrent streaming — the entire core feature of the project is NOT yet implemented
3. RESTful API — completely missing; evaluators will test every endpoint
4. CSRF protection — at minimum use SameSite=Strict + verify cookies
5. Upload validation — profile picture upload has no type/size checks

---

## Missing Dependencies / Tools

| Tool | Needed For | Status |
|------|-----------|--------|
| libtorrent Python binding | Torrent downloading | Not installed |
| FFmpeg | mkv to mp4/webm transcoding | Not in Dockerfile |
| OpenSubtitles API or similar | Subtitle download | Not integrated |
| i18next or react-intl | Frontend i18n | Not installed |
| archive.org / legittorrents | Legal torrent search (2nd source) | Not integrated |
