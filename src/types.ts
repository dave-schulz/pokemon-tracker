export interface Product {
  id?: number;
  store: string;
  title: string;
  link: string;
  price?: string | null;
  oldPrice?: string | null;
  inStock?: boolean | null;
  lastSeen?: Date | null;
  createdAt?: Date | null;
}
