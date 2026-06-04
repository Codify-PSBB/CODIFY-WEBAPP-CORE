import { existsSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const SALT = "CODIFY_SALT_2026!";

const usersJsonPath = resolve(process.cwd(), "scripts", "users.json");
const outputSqlPath = resolve(process.cwd(), "scripts", "insert_users.sql");

// Check if users.json exists
if (!existsSync(usersJsonPath)) {
  const template = [
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
  ];
  writeFileSync(usersJsonPath, JSON.stringify(template, null, 2), "utf-8");
  console.log(`[INFO] Created template at: ${usersJsonPath}`);
  console.log(`Please open it, replace with your student details, and run this script again.`);
  process.exit(0);
}

try {
  const users = JSON.parse(readFileSync(usersJsonPath, "utf-8"));
  
  if (!Array.isArray(users)) {
    throw new Error("users.json must be a JSON array of user objects.");
  }

  let sqlContent = `-- Generated SQL for inserting student accounts\n\n`;

  for (const user of users) {
    const { name, eduId, grade, password } = user;
    if (!name || !eduId || !grade || !password) {
      console.warn(`[WARNING] Skipping invalid user record: ${JSON.stringify(user)}`);
      continue;
    }

    const username = eduId.toUpperCase().trim();
    const email = username.toLowerCase();
    const passwordHash = createHash("sha256").update(password + SALT).digest("hex");
    const numericGrade = parseInt(grade, 10);

    // SQL query using ON CONFLICT to allow updates if the user email already exists
    sqlContent += `INSERT INTO users (name, email, role, xp, password_hash, grade) VALUES (\n  '${name.replace(/'/g, "''")}',\n  '${email}',\n  'member',\n  0,\n  '${passwordHash}',\n  ${numericGrade}\n) ON CONFLICT(email) DO UPDATE SET\n  name = excluded.name,\n  password_hash = excluded.password_hash,\n  grade = excluded.grade;\n\n`;
  }

  writeFileSync(outputSqlPath, sqlContent, "utf-8");
  console.log(`[SUCCESS] Generated SQL file at: ${outputSqlPath}`);
  console.log(`\nTo run this against your D1 database:`);
  console.log(`  Local:   npx wrangler d1 execute coding-club-db --local --file=scripts/insert_users.sql`);
  console.log(`  Remote:  npx wrangler d1 execute coding-club-db --remote --file=scripts/insert_users.sql`);

} catch (error) {
  console.error(`[ERROR] Failed to generate users SQL:`, error.message);
  process.exit(1);
}
