# Student Account Management Instructions

This directory contains the utility script `create-users.mjs` to batch-create and import student accounts into your Cloudflare D1 database.

## Instructions

### 1. Populate the User List
Create or edit `scripts/users.json` with the student accounts. Format:
```json
[
  {
    "name": "Jane Doe",
    "eduId": "S12345",
    "grade": 9,
    "password": "changeme123"
  },
  {
    "name": "Alex Smith",
    "eduId": "S67890",
    "grade": 10,
    "password": "changeme456"
  }
]
```

### 2. Generate the SQL script
Run the script to hash the passwords (using the platform's standard SHA-256 + salt configuration) and generate SQL insertions:
```bash
node scripts/create-users.mjs
```
This generates `scripts/insert_users.sql`.

### 3. Deploy/Import to Production
Run the generated SQL against your remote Cloudflare D1 database:
```bash
npx wrangler d1 execute coding-club-db --remote --file=scripts/insert_users.sql
```

## Security Note
Both `users.json` and `insert_users.sql` are listed in `.gitignore` to prevent raw credentials or password hashes from being committed to repository history.
