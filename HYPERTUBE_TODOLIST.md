# Hypertube Implementation Todolist

This todolist covers all requirements from the Hypertube subject PDF and is organized to guide implementation in a logical order.

## ✅ ALREADY IMPLEMENTED

### User Authentication:
- ✅ User registration with email, username, password
- ✅ User login with email/password  
- ✅ Google OAuth integration
- ✅ 42 OAuth integration
- ✅ JWT token authentication with refresh tokens
- ✅ Password hashing with bcrypt
- ✅ Redis caching for user sessions
- ✅ Logout functionality

### Basic Infrastructure:
- ✅ FastAPI backend with PostgreSQL database
- ✅ React frontend with TypeScript
- ✅ Docker setup with docker-compose
- ✅ TMDB API integration for movies/series
- ✅ Basic movie/series browsing with pagination
- ✅ Movie details page with cast, crew, trailers
- ✅ User model with favorites and history tracking
- ✅ CORS middleware
- ✅ Basic routing structure

## ❌ MISSING IMPLEMENTATION (95 tasks)

### USER MANAGEMENT (14 tasks)

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
11. [ ] Add profile picture upload functionality
12. [ ] Implement GET /user/:id endpoint for viewing other profiles
13. [ ] Ensure email is private in other users' profile views
14. [ ] Create frontend profile page with edit functionality

### LIBRARY/SEARCH (12 tasks)

15. [ ] Add search input field to Movies/Series pages
16. [ ] Create search service that queries TMDB API
17. [ ] Add torrent source integration (legittorrents.info or archive.org)
18. [ ] Create backend search endpoint combining multiple sources
19. [ ] Update frontend to display search results
20. [ ] Add production year display to movie cards
21. [ ] Add IMDb/OMDb rating display to movie cards
22. [ ] Implement watched status tracking in History model
23. [ ] Add visual differentiation for watched/unwatched movies
24. [ ] Add sorting controls (name, genre, rating, year)
25. [ ] Add genre filter dropdown
26. [ ] Add year range filter
27. [ ] Add rating range filter

### TORRENT/STREAMING (15 tasks)

28. [ ] Install libtorrent or transmission library
29. [ ] Create torrent download service
30. [ ] Implement background torrent download with progress tracking
31. [ ] Add video streaming endpoint for downloaded files
32. [ ] Integrate video player component in frontend
33. [ ] Add streaming from partial downloads (chunked streaming)
34. [ ] Create download cache directory structure
35. [ ] Implement movie file persistence after download
36. [ ] Add cron job/scheduler to delete unwatched movies after 1 month
37. [ ] Add subtitle search service (OpenSubtitles)
38. [ ] Download and save subtitles for movies
39. [ ] Add subtitle selection in video player
40. [ ] Install FFmpeg for video conversion
41. [ ] Create video conversion service (mkv to mp4/webm)
42. [ ] Implement on-the-fly conversion for streaming

### COMMENTS SYSTEM (10 tasks)

43. [*] Complete Comment schema definitions
44. [*] Add movie_id to Comment model for relationship
45. [*] Create GET /comments endpoint (latest comments)
46. [*] Create GET /comments/:id endpoint (single comment)
47. [*] Create POST /comments endpoint
48. [*] Create POST /movies/:movie_id/comments endpoint
49. [*] Create PATCH /comments/:id endpoint
50. [*] Create DELETE /comments/:id endpoint
51. [*] Add authorization checks (users can only edit their own comments)
52. [*] Add comments section to MovieDetails frontend component
53. [*] Add comment form for posting new comments
54. [*] Display existing comments with author and timestamp

### RESTFUL API (16 tasks)

55. [ ] Create separate API router with /api prefix
56. [ ] Implement OAuth2 token authentication middleware
57. [ ] Create POST /api/oauth/token endpoint
58. [ ] Create GET /api/users endpoint (list users)
59. [ ] Create GET /api/users/:id endpoint (user details)
60. [ ] Create PATCH /api/users/:id endpoint (update profile)
61. [ ] Add 403 restriction for modifying other users' profiles
62. [ ] Create GET /api/movies endpoint (frontpage movies)
63. [ ] Create GET /api/movies/:id endpoint (movie details)
64. [ ] Create GET /api/comments endpoint (latest comments)
65. [ ] Create GET /api/comments/:id endpoint (comment details)
66. [ ] Create POST /api/comments endpoint
67. [ ] Create POST /api/movies/:movie_id/comments endpoint
68. [ ] Create PATCH /api/comments/:id endpoint
69. [ ] Create DELETE /api/comments/:id endpoint
70. [ ] Return appropriate HTTP codes for unauthorized requests

### SECURITY (10 tasks)

71. [ ] Add input validation to all form fields
72. [ ] Add email validation with regex
73. [ ] Add password strength validation
74. [ ] Add SQL injection protection (parameterized queries)
75. [ ] Add XSS protection for user-generated content
76. [ ] Add CSRF protection for state-changing operations
77. [ ] Add security headers (CSP, X-Frame-Options, etc.)
78. [ ] Add rate limiting to prevent abuse
79. [ ] Verify .env is in .gitignore
80. [ ] Remove any hardcoded credentials from code
81. [ ] Add file upload validation for profile pictures

### FRONTEND/RESPONSIVE (5 tasks)

82. [ ] Test responsive design on mobile devices
83. [ ] Fix layout issues on small screens (<768px)
84. [ ] Ensure touch targets are large enough for mobile
85. [ ] Test horizontal scrolling on mobile movie lists
86. [ ] Optimize images for mobile loading

### QUALITY/TESTING (4 tasks)

87. [ ] Run browser console and fix all errors/warnings
88. [ ] Add error boundaries for React components
89. [ ] Add loading states for all async operations
90. [ ] Test application in Chrome and Firefox

### LANGUAGE/INTERNATIONALIZATION (5 tasks)

91. [ ] Add language preference field to user settings
92. [ ] Create language translation files (i18n)
93. [ ] Implement language switcher component
94. [ ] Set English as default language
95. [ ] Add language detection from browser preferences

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

### Phase 1: Foundation (User Management)
- Tasks 1-14: Complete user profile system

### Phase 2: Core Features (Library & Search)  
- Tasks 15-27: Search, filtering, sorting functionality

### Phase 3: Advanced Features (Torrent/Streaming)
- Tasks 28-42: Core Hypertube functionality

### Phase 4: Social Features (Comments)
- Tasks 43-54: Comment system

### Phase 5: API Requirements
- Tasks 55-70: RESTful API implementation

### Phase 6: Security & Quality
- Tasks 71-90: Security hardening and testing

### Phase 7: Polish
- Tasks 91-95: Internationalization

## 📝 NOTES

- The project uses a hybrid approach: both TMDB API streaming and actual torrent functionality
- RESTful API will be implemented as separate /api/* endpoints with OAuth2 token authentication
- Email functionality will use existing SMTP credentials
- Full user profile system includes first name, last name, and language preferences
- Security is critical - no plain text passwords, proper validation, and CSRF protection required
- Mobile responsiveness is mandatory for the project
- No console errors or warnings allowed in browser during evaluation