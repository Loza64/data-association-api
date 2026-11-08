export interface Category {
  id: string;
  name: string;
  description: string;
  productsCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategorySummary {
  id: string;
  name: string;
}
