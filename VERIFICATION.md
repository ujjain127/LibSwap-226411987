# Local verification — 10 September 2026

Tested the individual repository with Compose project `libswap-individual-check`,
a newly created MongoDB volume, and host port 3001 because port 3000 was occupied.

- `build --pull --no-cache`: passed; locked production dependencies installed.
- `up -d --wait`: app and MongoDB healthy.
- `seed:demo`: demo accounts and books created.
- `npm test` with `TEST_MONGODB_URI=mongodb://mongo:27017`: passed, 1 integration test, 0 failures. Includes registration/login, concurrent loans, duplicate reservations, ownership, queue priority, legacy records, persisted fields and static assets.
- `scripts/docker-e2e.js before`: passed identity, pages, demo login, borrow, reserve and return ownership.
- Containers removed using `down`, then recreated using `up -d --wait` with the volume retained.
- `scripts/docker-e2e.js after`: passed persisted loan/reservation, queue priority, reserved borrowing and final return.
- Host requests to `http://localhost:3001/api/student` and `/api/health`: correct full name/student ID and connected database; catalogue HTTP 200.
- Application logs: MongoDB connected, server listening; both containers healthy.
- Frontend code uses relative API URLs. Page and asset serving was tested over HTTP; browser clicks were not automated.
- Individual `origin` remains `https://github.com/ujjain127/LibSwap-226411987.git`, branch `main`. No commit or push performed.

The verification stack remains available on port 3001. To stop this specific stack:

```bash
docker compose -p libswap-individual-check --env-file .env.docker down
```

Fresh clones use the README commands and default port 3000. The local ignored
`.env.docker` uses port 3001 and contains generated private secrets.
