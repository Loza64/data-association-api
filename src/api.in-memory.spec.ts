import { createApp } from './app';
import { buildContainer } from './composition-root';
import { buildInMemoryRepositories } from './testing/in-memory.repositories';
import { describeApi } from './testing/api-scenarios';

const { db, ...repositories } = buildInMemoryRepositories();
void db;
const app = createApp(buildContainer(repositories));

describeApi('API (repositorios en memoria)', () => app);
