import { auth, db } from "./firebase";
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

/**
 * Pastikan ada sesi untuk pelanggan.
 *
 * Firestore rules mewajibkan `request.auth != null` untuk membuat pesanan,
 * jadi pelanggan login anonim secara diam-diam — tanpa form, tanpa password.
 * Kalau sudah ada sesi (mis. kasir yang sedang login), sesi itu dipakai ulang.
 */
export const ensureCustomerSession = (): Promise<User> => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        unsubscribe(); // Cek status awal saja
        if (user) {
          resolve(user);
        } else {
          try {
            const cred = await signInAnonymously(auth);
            resolve(cred.user);
          } catch (error) {
            reject(error);
          }
        }
      },
      reject
    );
  });
};

/** Login kasir/admin dengan email + password. */
export const signInAdmin = async (email: string, password: string) => {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    if (!(await checkIsAdmin(cred.user))) {
      await signOut(auth);
      return {
        success: false as const,
        error: "Akun ini tidak terdaftar sebagai admin kasir.",
      };
    }
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: describeAuthError(error) };
  }
};

export const signOutUser = () => signOut(auth);

/**
 * Cek apakah user punya hak admin.
 *
 * Sumber kebenarannya adalah dokumen `admins/{uid}` di Firestore — dokumen yang
 * sama yang dibaca oleh security rules. Hasil di sini hanya untuk tampilan UI;
 * penegakan sesungguhnya tetap di rules, di sisi server.
 */
export const checkIsAdmin = async (user: User | null): Promise<boolean> => {
  if (!user || user.isAnonymous) return false;
  try {
    const snap = await getDoc(doc(db, "admins", user.uid));
    return snap.exists();
  } catch {
    return false;
  }
};

export const onAuthChange = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback);

function describeAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-email":
      return "Format email tidak valid.";
    case "auth/user-disabled":
      return "Akun ini dinonaktifkan.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email atau password salah.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.";
    case "auth/network-request-failed":
      return "Gagal terhubung. Periksa koneksi internet Anda.";
    case "auth/operation-not-allowed":
      return "Login email/password belum diaktifkan di Firebase Console.";
    case "auth/configuration-not-found":
      return "Firebase Authentication belum diaktifkan di Firebase Console.";
    default:
      return "Gagal login. Silakan coba lagi.";
  }
}
