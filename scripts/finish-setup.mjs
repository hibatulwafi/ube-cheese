/**
 * Menunggu Firebase Authentication diaktifkan di Console, lalu menyelesaikan
 * sisa setup secara otomatis:
 *
 *   1. menyalakan provider Email/Password + Anonymous;
 *   2. membuat akun admin dan dokumen `admins/{uid}`;
 *   3. men-deploy firestore.rules.
 *
 *   node scripts/finish-setup.mjs <email> <password> [menitTungguMaks]
 *
 * Satu-satunya langkah manual adalah menekan "Get started" di
 * Console → Authentication. Endpoint API untuk itu billing-gated, sedangkan
 * tombol di Console memakai jalur gratis yang tidak terbuka untuk publik.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const PROJECT = "input-icip";
const CLIENT_ID =
  "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";
const POLL_SECONDS = 10;

const [email, password, maxMinutesArg] = process.argv.slice(2);
const maxMinutes = Number(maxMinutesArg ?? 20);

if (!email || !password) {
  console.error("Cara pakai: node scripts/finish-setup.mjs <email> <password> [menit]");
  process.exit(1);
}

const apiKey = readEnv("NEXT_PUBLIC_FIREBASE_API_KEY");
const deadline = Date.now() + maxMinutes * 60_000;

console.log(`Menunggu Authentication diaktifkan (maks ${maxMinutes} menit)...`);
console.log(
  `Buka: https://console.firebase.google.com/project/${PROJECT}/authentication\n`
);

// ── 1. Poll sampai Authentication ter-provision ─────────────────────────
let ready = false;
let attempt = 0;

while (Date.now() < deadline) {
  attempt++;
  const state = await probeAuthState();

  if (state === "ready" || state === "provider-off") {
    console.log(`\n✓ Authentication aktif (terdeteksi pada percobaan ke-${attempt})`);
    ready = true;
    break;
  }

  const label = state === "unreachable" ? "jaringan gagal, ulangi" : "belum aktif";
  console.log(`  percobaan ${attempt}: ${label}`);
  await sleep(POLL_SECONDS * 1000);
}

if (!ready) {
  console.error(
    `\n\n✗ Menyerah setelah ${maxMinutes} menit — Authentication masih belum diaktifkan.\n` +
      "  Klik \"Get started\" di Console, lalu jalankan lagi:\n" +
      `  npm run setup:admin -- ${email} <password>`
  );
  process.exit(1);
}

// ── 2. Nyalakan provider yang dibutuhkan ────────────────────────────────
const token = await getAccessToken();
const mask =
  "signIn.email.enabled,signIn.email.passwordRequired,signIn.anonymous.enabled";
const patch = await request(
  `https://identitytoolkit.googleapis.com/v2/projects/${PROJECT}/config?updateMask=${mask}`,
  {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      signIn: {
        email: { enabled: true, passwordRequired: true },
        anonymous: { enabled: true },
      },
    }),
  }
);

if (patch.ok) {
  const signIn = patch.body.signIn ?? {};
  console.log(
    `✓ Provider aktif — email/password: ${signIn.email?.enabled}, anonymous: ${signIn.anonymous?.enabled}`
  );
} else {
  console.warn(
    "! Gagal menyalakan provider otomatis. Aktifkan manual di Console → Sign-in method.\n " +
      JSON.stringify(patch.body).slice(0, 200)
  );
}

// ── 3. Buat admin + deploy rules ────────────────────────────────────────
console.log("\nMenjalankan setup admin...\n");
const result = spawnSync(
  process.execPath,
  [path.join(import.meta.dirname, "setup-admin.mjs"), email, password],
  { stdio: "inherit" }
);
process.exit(result.status ?? 1);

// ── helpers ─────────────────────────────────────────────────────────────

/** Probe tanpa efek samping: tidak membuat user apa pun. */
async function probeAuthState() {
  const res = await request(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "probe-nonexistent@example.com",
        password: "probe12345",
        returnSecureToken: true,
      }),
    }
  );
  if (res.networkError) return "unreachable";

  const message = res.body?.error?.message ?? "";
  if (message.startsWith("CONFIGURATION_NOT_FOUND")) return "not-provisioned";
  if (message.startsWith("OPERATION_NOT_ALLOWED")) return "provider-off";
  return "ready";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readEnv(key) {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) {
    console.error(".env.local tidak ditemukan.");
    process.exit(1);
  }
  const line = fs
    .readFileSync(file, "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${key}=`));
  if (!line) {
    console.error(`${key} tidak ada di .env.local`);
    process.exit(1);
  }
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
}

async function getAccessToken() {
  const file = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
  const refreshToken = JSON.parse(fs.readFileSync(file, "utf8"))?.tokens?.refresh_token;
  const res = await request("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    console.error("Gagal memperbarui token. Jalankan: firebase login --reauth");
    process.exit(1);
  }
  return res.body.access_token;
}

/**
 * Polling berjalan sampai 20 menit, jadi gangguan jaringan sesaat harus
 * dianggap "coba lagi nanti" — bukan alasan untuk mematikan proses.
 */
async function request(url, init) {
  let res;
  try {
    res = await fetch(url, init);
  } catch (error) {
    return { ok: false, networkError: true, body: { error: { message: String(error) } } };
  }
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { ok: res.ok, body };
}
