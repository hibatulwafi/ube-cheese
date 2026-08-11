import { db } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  getDocs,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { MenuItem, Order, OrderItem, OrderStatus } from "@/types";
import { ensureCustomerSession } from "./auth";

// ─────────────────────────────────────────────
// PATH HELPERS
// ─────────────────────────────────────────────
const STORE_DOC = "ubi-cheese/store";
const menusRef = () => collection(db, `${STORE_DOC}/menus`);
const ordersRef = () => collection(db, `${STORE_DOC}/orders`);
const menuDocRef = (id: string) => doc(db, `${STORE_DOC}/menus`, id);
const orderDocRef = (id: string) => doc(db, `${STORE_DOC}/orders`, id);

/**
 * Pastikan dokumen induk "ubi-cheese/store" ada di Firestore.
 *
 * Sebenarnya Firestore tetap bisa menyimpan subcollection walau dokumen
 * induknya tidak ada — dokumen ini dibuat semata agar struktur data terlihat
 * rapi di Console. Hanya admin yang boleh membuatnya, jadi fungsi ini
 * dipanggil dari jalur kasir saja, bukan dari checkout pelanggan.
 */
export const ensureStoreExists = async () => {
  const storeRef = doc(db, "ubi-cheese", "store");
  const storeSnap = await getDoc(storeRef);
  if (!storeSnap.exists()) {
    await setDoc(storeRef, {
      name: "Ube Cheese",
      created_at: serverTimestamp(),
    });
    console.log("✅ Dokumen store berhasil dibuat di Firestore.");
  }
};

// ─────────────────────────────────────────────
// ORDER API
// ─────────────────────────────────────────────

/** Buat pesanan baru (dipanggil oleh Customer) */
export const createOrder = async (
  customerName: string,
  items: OrderItem[],
  totalPrice: number
) => {
  try {
    // Rules menolak pesanan tanpa sesi, jadi pastikan pelanggan punya
    // sesi anonim sebelum menulis.
    const user = await ensureCustomerSession();
    const docRef = await addDoc(ordersRef(), {
      customer_name: customerName,
      items,
      total_price: totalPrice,
      status: "pending_payment" as OrderStatus,
      created_by: user.uid,
      created_at: serverTimestamp(),
    });
    return { success: true, orderId: docRef.id };
  } catch (error) {
    console.error("Error creating order: ", error);
    return { success: false, error };
  }
};

/** Dengarkan perubahan pesanan secara real-time (dipanggil oleh Cashier) */
export const subscribeToOrders = (callback: (orders: Order[]) => void) => {
  const q = query(ordersRef(), orderBy("created_at", "desc"));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const orders: Order[] = snapshot.docs.map((d) => ({
      id: d.id,
      customer_name: d.data().customer_name,
      items: d.data().items,
      total_price: d.data().total_price,
      status: d.data().status,
      created_by: d.data().created_by,
      created_at: d.data().created_at,
    }));
    callback(orders);
  });
  return unsubscribe;
};

/** Update status pesanan (Kasir) */
export const updateOrderStatus = async (
  orderId: string,
  newStatus: OrderStatus
) => {
  try {
    await updateDoc(orderDocRef(orderId), { status: newStatus });
    return { success: true };
  } catch (error) {
    console.error("Error updating order status: ", error);
    return { success: false, error };
  }
};

/** Hapus pesanan permanen (Kasir/Admin) */
export const deleteOrder = async (orderId: string) => {
  try {
    await deleteDoc(orderDocRef(orderId));
    return { success: true };
  } catch (error) {
    console.error("Error deleting order: ", error);
    return { success: false, error };
  }
};

// ─────────────────────────────────────────────
// MENU API
// ─────────────────────────────────────────────

/** Ambil semua menu (satu kali) */
export const getMenus = async (): Promise<MenuItem[]> => {
  try {
    const snapshot = await getDocs(menusRef());
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as MenuItem[];
  } catch (error) {
    console.error("Error getting menus: ", error);
    return [];
  }
};

/** Dengarkan perubahan menu secara real-time */
export const subscribeToMenus = (callback: (menus: MenuItem[]) => void) => {
  const q = query(menusRef(), orderBy("name", "asc"));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const menus: MenuItem[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as MenuItem[];
    callback(menus);
  });
  return unsubscribe;
};

/** Tambah menu baru (Kasir/Admin) */
export const addMenu = async (menu: Omit<MenuItem, "id" | "created_at">) => {
  try {
    await ensureStoreExists();
    const docRef = await addDoc(menusRef(), {
      ...menu,
      created_at: serverTimestamp(),
    });
    return { success: true, menuId: docRef.id };
  } catch (error) {
    console.error("Error adding menu: ", error);
    return { success: false, error };
  }
};

/** Update menu (Kasir/Admin) */
export const updateMenu = async (
  menuId: string,
  data: Partial<Omit<MenuItem, "id" | "created_at">>
) => {
  try {
    await updateDoc(menuDocRef(menuId), data);
    return { success: true };
  } catch (error) {
    console.error("Error updating menu: ", error);
    return { success: false, error };
  }
};

/** Hapus menu (Kasir/Admin) */
export const deleteMenu = async (menuId: string) => {
  try {
    await deleteDoc(menuDocRef(menuId));
    return { success: true };
  } catch (error) {
    console.error("Error deleting menu: ", error);
    return { success: false, error };
  }
};
