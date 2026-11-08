import { Product } from '../../domain/product.entity';

export const presentProduct = ({ categoryId: _categoryId, ...product }: Product) => product;
