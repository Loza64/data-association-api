import 'reflect-metadata';
import { createRequire } from 'module';
import { validationMetadatasToSchemas } from 'class-validator-jsonschema';

import '../pagination/pagination-query.dto';
import '../dto/id-ref.dto';
import '../../modules/auth/application/signup.dto';
import '../../modules/auth/application/login.dto';
import '../../modules/user/application/update-user.dto';
import '../../modules/user/application/user-query.dto';
import '../../modules/category/application/category.dto';
import '../../modules/product/application/product.dto';
import '../../modules/order/application/order.dto';

const requireModule = createRequire(__filename);

const getClassTransformerMetadataStorage = () => {
  const candidatePaths = ['class-transformer/cjs/storage', 'class-transformer/storage', 'class-transformer/esm5/storage'];

  for (const path of candidatePaths) {
    try {
      return requireModule(path).defaultMetadataStorage;
    } catch {
      continue;
    }
  }

  return undefined;
};

export const buildSwaggerDefinitions = (): Record<string, unknown> => {
  const classTransformerMetadataStorage = getClassTransformerMetadataStorage();

  const schemas = validationMetadatasToSchemas({
    refPointerPrefix: '#/components/schemas/',
    ...(classTransformerMetadataStorage ? { classTransformerMetadataStorage } : {}),
  });

  return schemas as Record<string, unknown>;
};
