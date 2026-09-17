import type { ProductInput, Product } from "@/types/product";
import { getProducts } from "@/utils/product-storage";

const STORAGE_KEY = "minipos-products";

// Mengambil satu produk berdasarkan ID
export function getProductById(id: string) {
  const products = getProducts();

  const product = products.find((item) => {
    return item.id === id;
  });

  return product ?? null;
}

// Mengubah/memperbarui data produk berdasarkan ID
export function updateProduct(id: string, input: ProductInput) {
  const products = getProducts();

  const updatedProducts = products.map((product) => {
    if (product.id !== id) {
      return product;
    }

    return {
      ...product,
      ...input,
      updatedAt: new Date().toISOString(),
    };
  });

  saveProducts(updatedProducts);

  return getProductById(id);
}

// Menghapus produk berdasarkan ID
export function deleteProduct(id: string) {
  const products = getProducts();

  const filteredProducts = products.filter((product) => {
    return product.id !== id;
  });

  saveProducts(filteredProducts);
}

function saveProducts(products: Product []) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}


