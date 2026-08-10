/**
 * Buat akun admin kasir.
 *
 *   node scripts/setup-admin.mjs <email> <password>
 *
 * Script ini melakukan dua hal yang tidak bisa dilakukan dari browser:
 *   1. mendaftarkan user email/password di Firebase Authentication;
 *   2. menulis dokumen `admins/{uid}` — dokumen yang dibaca security rules
 *      untuk menentukan siapa yang boleh mengelola menu & pesanan.
 *
 * Rules sengaja melarang penulisan `admins/*` dari klien (`allow write: if false`)
 * supaya tidak ada yang bisa mengangkat dirinya sendiri jadi admin. Karena itu
 * script ini memakai kredensial Firebase CLI Anda (`firebase login`), yang lewat
 * IAM berhak melewati security rules.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const PROJECT = "input-icip";
// OAuth client publik milik firebase-tools (open source).
const CLIENT_ID =
  "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error("Cara pakai: node scripts/setup-admin.mjs <email> <password>");
  process.exit(1);
}
if (password.length < 6) {
  console.error("Password minimal 6 karakter (aturan Firebase Auth).");
  process.exit(1);
}

const apiKey = readEnv("NEXT_PUBLIC_FIREBASE_API_KEY");

// ── 1. Ambil access token dari kredensial Firebase CLI ──────────────────
const accessToken = await getAccessToken();
console.log("✓ Kredensial Firebase CLI terbaca");

// ── 2. Daftarkan / temukan user di Firebase Auth ────────────────────────
let uid;
const signUp = await postJson(
  `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
  { email, password, returnSecureToken: true }
);

if (signUp.ok) {
  uid = signUp.body.localId;
  console.log(`✓ User baru dibuat  (uid: ${uid})`);
} else {
  const message = signUp.body?.error?.message ?? "";

  if (message.startsWith("EMAIL_EXISTS")) {
    const signIn = await postJson(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      { email, password, returnSecureToken: true }
    );
    if (!signIn.ok) {
      fail(
        `Email "${email}" sudah terdaftar, tapi password yang Anda berikan salah.\n` +
          `  Pakai password yang benar, atau reset lewat Firebase Console → Authentication.`
      );
    }
    uid = signIn.body.localId;
    console.log(`✓ User sudah ada, dipakai ulang  (uid: ${uid})`);
  } else if (message.startsWith("CONFIGURATION_NOT_FOUND")) {
    fail(
      "Firebase Authentication belum diaktifkan.\n" +
        `  Buka https://console.firebase.google.com/project/${PROJECT}/authentication\n` +
        "  lalu klik \"Get started\" dan aktifkan provider Email/Password + Anonymous."
    );
  } else if (message.startsWith("OPERATION_NOT_ALLOWED")) {
    fail(
      "Provider Email/Password belum diaktifkan.\n" +
        `  Buka https://console.firebase.google.com/project/${PROJECT}/authentication/providers`
    );
  } else {
    fail(`Gagal membuat user: ${message}`);
  }
}

// ── 3. Tandai user sebagai admin ────────────────────────────────────────
const doc = await request(
  `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/admins/${uid}`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        email: { stringValue: email },
        created_at: { timestampValue: new Date().toISOString() },
      },
    }),
  }
);

if (!doc.ok) {
  fail(`Gagal menulis dokumen admins/${uid}: ${JSON.stringify(doc.body)}`);
}

console.log(`✓ Dokumen admins/${uid} dibuat`);

// ── 4. Baru setelah admin ada, aktifkan rules yang ketat ────────────────
// Urutannya penting: kalau rules di-deploy lebih dulu, belum ada satu pun
// akun yang lolos isAdmin() dan halaman kasir jadi terkunci total.
console.log("\nMen-deploy firestore.rules...");
const deploy = spawnSync("firebase", ["deploy", "--only", "firestore:rules"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (deploy.status !== 0) {
  fail(
    "Deploy rules gagal. Akun admin sudah dibuat, jadi cukup jalankan ulang:\n" +
      "  npm run deploy:rules"
  );
}

console.log(`\nSelesai. Login di /cashier dengan email: ${email}`);

// ── helpers ─────────────────────────────────────────────────────────────

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function readEnv(key) {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) fail(".env.local tidak ditemukan.");
  const line = fs
    .readFileSync(file, "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${key}=`));
  if (!line) fail(`${key} tidak ada di .env.local`);
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
}

async function getAccessToken() {
  const file = path.join(
    os.homedir(),
    ".config",
    "configstore",
    "firebase-tools.json"
  );
  if (!fs.existsSync(file)) {
    fail("Belum login Firebase CLI. Jalankan: firebase login");
  }
  const refreshToken = JSON.parse(fs.readFileSync(file, "utf8"))?.tokens
    ?.refresh_token;
  if (!refreshToken) fail("Token Firebase CLI tidak valid. Jalankan: firebase login --reauth");

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
  if (!res.ok) fail("Gagal memperbarui token. Jalankan: firebase login --reauth");
  return res.body.access_token;
}

async function postJson(url, payload) {
  return request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function request(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { ok: res.ok, body };
}
