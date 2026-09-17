import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type {
  TransactionItem,
  PaymentMethod,
  SaleTransaction,
  CartItem,
} from "@/types/transaction";
import { createInvoiceNumber } from "@/utils/invoice";

// Menentukan referensi sub-koleksi transaksi milik user tertentu
const transactionCollection = (uid: string) => {
  return collection(db, "users", uid, "transactions");
};

type CreateTransactionPayload = {
  items: TransactionItem[];
  total: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
};

type CheckoutInput = {
  items: CartItem [];
  paymentMethod: PaymentMethod;
  paymentAmount: number;
};

// Generator nomor invoice berbasis waktu Unix saat ini
function generateInvoiceNumber() {
  return `TRX-${Date.now()}`;
}

// FUNGSI 1: Membuat transaksi baru (Metode Sekuensial)
export const createTransaction = async (
  uid: string,
  payload: CreateTransactionPayload,
) => {
  // Hitung uang kembalian pembeli
  const changeAmount = payload.paidAmount - payload.total;

  // Siapkan dokumen transaksi baru dengan ID otomatis
  const transactionRef = doc(transactionCollection(uid));

  // Mulai proses Firestore Transaction
  await runTransaction(db, async (transaction) => {
    const products: {
      item: TransactionItem;
      ref: ReturnType<typeof doc>;
      stock: number;
      name: string;
    }[] = [];

    // LANGKAH 1: Membaca data produk satu per satu dari database
    for (const item of payload.items) {
      const productRef = doc(db, "users", uid, "products", item.productId);

      const productSnap = await transaction.get(productRef);

      // Proteksi jika produk tidak ada di database
      if (!productSnap.exists()) {
        throw new Error(
          `Product "${item.name}" dengan ID "${item.productId}" tidak ditemukan`,
        );
      }

      const productData = productSnap.data();

      // Kumpulkan data produk asli ke dalam array sementara
      products.push({
        item,
        ref: productSnap.ref,
        stock: productData.stock ?? 0,
        name: productData.name ?? item.name,
      });
    }

    // LANGKAH 2: Validasi kuantitas dan potong stok produk
    for (const product of products) {
      if (product.stock < product.item.quantity) {
        throw new Error(
          `Stock "${product.name}" tidak mencukupi. ` +
            `Tersedia: ${product.stock}, ` +
            `dibutuhkan: ${product.item.quantity}`,
        );
      }

      // Perbarui stok produk di database
      transaction.update(product.ref, {
        stock: product.stock - product.item.quantity,
      });
    }

    // LANGKAH 3: Simpan invoice transaksi utama ke database
    transaction.set(transactionRef, {
      invoiceNumber: generateInvoiceNumber(),
      items: payload.items,
      total: payload.total,
      paidAmount: payload.paidAmount,
      changeAmount,
      paymentMethod: payload.paymentMethod,
      createdAt: serverTimestamp(),
    });
  });

  // Kembalikan ID dari transaksi yang berhasil dibuat
  return transactionRef.id;
};

// FUNGSI 2: Mengambil semua daftar transaksi milik user (Diurutkan dari yang terbaru)
export async function getTransactions(uid: string): Promise<SaleTransaction[]> {
  const q = query(transactionCollection(uid), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  
  // Format data Firestore menjadi objek JavaScript standar
  return snapshot.docs.map((item) => {
    const data = item.data();

    return {
      id: item.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
    } as SaleTransaction;
  });
}

// FUNGSI 3: Mengambil detail satu transaksi berdasarkan ID tertentu
export async function getTransactionsById(
  uid: string,
  transactionId: string,
): Promise<SaleTransaction | null> {
  const docRef = doc(db, "users", uid, "transactions", transactionId);
  const snapshot = await getDoc(docRef);

  // Jika transaksi tidak ditemukan, kembalikan nilai null
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  // Kembalikan detail data transaksi beserta konversi waktu
  return {
    id: snapshot.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
  } as SaleTransaction;
}

// FUNGSI 4: Memproses checkout kasir (Metode Paralel)
export async function checkout(uid: string, input: CheckoutInput) {
  // Validasi awal keranjang belanja
  if (input.items.length === 0) throw new Error ("Keranjang masih kosong.");

  // Hitung total belanja dari akumulasi harga dikali jumlah item
  const total = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  // Validasi jika pembayaran tunai tetapi uangnya kurang
  if (input.paymentMethod === "cash" && input.paymentAmount < total) {
    throw new Error("Uang pembayaran masih kurang");
  }

  const invoiceNumber = createInvoiceNumber();
  const transactionRef = doc(collection(db, "users", uid, "transactions"));

  // Mulai proses Firestore Transaction secara asinkron
  await runTransaction(db,async (firestoreTransaction) => {
    
    // LANGKAH 1: Membaca seluruh data produk secara paralel bersamaan
    const productSnapshots= await Promise.all(
      input.items.map((item) =>
      firestoreTransaction.get(doc(db,"users", uid, "products", item.productId))
      )
    );

    // LANGKAH 2: Validasi ketersediaan produk dan batas aman stok pembeli
    productSnapshots.forEach((snapshot, index) => {
      const cartItem = input.items[index];
      if (!snapshot.exists()) throw new Error(`Produk ${cartItem.name} tidak ditemukan. `);
      const currentStock = Number (snapshot.data().stock ?? 0);
      if (currentStock < cartItem.quantity) {
        throw new Error (`Stok ${cartItem.name} tidak mencukupi.`);
      }
    });

    // LANGKAH 3: Jalankan operasi pemotongan stok produk
    productSnapshots.forEach ((snapshot, index) => {
      const cartItem = input.items[index];
      const currentStock = Number (snapshot.data()?.stock ?? 0);
      firestoreTransaction.update(snapshot.ref, {
        stock: currentStock - cartItem.quantity,
        updateAt: serverTimestamp(),
      });
    });
    
    // Filter data item untuk mengabaikan properti yang tidak diperlukan di database
    const cleanItems = input.items.map(({ productId, name, sku, price, quantity }) => ({
      productId,
      name,
      sku,
      price,
      quantity,
    }));

    // LANGKAH 4: Buat dan simpan data rekap transaksi akhir
    firestoreTransaction.set(transactionRef, {
      invoiceNumber,
      items: cleanItems,
      subtotal: total,
      total,
      paymentMethod: input.paymentMethod,
      paymentAmount: input.paymentAmount,
      change: input.paymentMethod === "cash" ? input.paymentAmount - total : 0,
      createdAt: serverTimestamp(),
    });
  });

  // Kembalikan detail transaksi ringkas untuk keperluan UI/Nota setelah berhasil
  return { transactionId: transactionRef.id, invoiceNumber, total};
}
