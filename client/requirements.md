## Packages
(none needed)

## Notes
Uses existing shadcn/ui components already in repo.
Assumes backend supports:
- GET /api/health -> { ok: true }
- POST /api/users -> creates user from { username, password }
All fetches include credentials: "include".
