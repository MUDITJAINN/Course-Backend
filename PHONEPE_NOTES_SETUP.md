# PhonePe Notes Payment Setup

This project unlocks notes only after verified payment, and only for the same logged-in user.

## 1) Where to change note prices

- Backend billing amount (actual amount charged):
  - `backend/controller/note.controller.js`
  - Edit `NOTES_CATALOG` values (`priceInPaise`)
  - Example: Rs. 199 => `19900`
- Frontend display amount:
  - `frontend/src/components/Notes.jsx`
  - Edit `price` in `NOTES` array

Keep both in sync.

## 2) PhonePe env variables (backend `.env`)

Set these:

- `PHONEPE_MERCHANT_ID=...`
- `PHONEPE_SALT_KEY=...`
- `PHONEPE_SALT_INDEX=1`
- `PHONEPE_BASE_URL=https://api-preprod.phonepe.com/apis/pg-sandbox` (sandbox)
- `BACKEND_URL=http://localhost:4001`
- `FRONTEND_URL=http://localhost:5173`

## 3) Payment flow (high level)

1. Frontend calls `POST /api/v1/notes/create-payment/:noteId`.
2. Backend creates PhonePe transaction and returns redirect URL.
3. Frontend redirects user to PhonePe page.
4. PhonePe redirects back to `/notes?noteId=...&transactionId=...`.
5. Frontend calls `GET /api/v1/notes/verify-payment`.
6. Backend checks PhonePe status API:
   - state must be `COMPLETED`
   - amount must exactly match configured note amount
7. Backend marks purchase `SUCCESS`, then frontend unlocks download.

## 4) Same-login-only access

- Purchase rows are stored with `userId + noteId`.
- Unlock list API returns only current user's successful purchases.
- Different login will not see/download notes unless that account paid.

