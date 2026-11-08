import { Express } from 'express';
import request from 'supertest';

const PASSWORD = 'Zebra-lantern-quartz-vessel-47';

interface Session {
  id: string;
  token: string;
  auth: { Authorization: string };
}

export const describeApi = (title: string, getApp: () => Express | string): void => {
  describe(title, () => {
    let counter = 0;
    const api = () => request(getApp());

    const register = async (prefix = 'user'): Promise<Session> => {
      counter += 1;
      const username = `${prefix}${Date.now().toString(36)}${counter}`;
      const signup = await api().post('/api/auth/signup').send({ name: 'Usuario Prueba', username, password: PASSWORD });
      expect(signup.status).toBe(201);
      const login = await api().post('/api/auth/login').send({ username, password: PASSWORD });
      expect(login.status).toBe(200);
      const token = login.body.data.accessToken as string;
      return { id: signup.body.data.id, token, auth: { Authorization: `Bearer ${token}` } };
    };

    const uniqueName = (prefix: string): string => {
      counter += 1;
      return `${prefix} ${Date.now().toString(36)}${counter}`;
    };

    const createCategory = async (s: Session, name = uniqueName('Categoria')) => {
      const res = await api().post('/api/categories').set(s.auth).send({ name, description: 'Descripción' });
      expect(res.status).toBe(201);
      return res.body.data as { id: string; name: string };
    };

    const createProduct = async (s: Session, categoryId: string, price = 19.99, extra: object = {}) => {
      const res = await api()
        .post('/api/products')
        .set(s.auth)
        .send({ name: uniqueName('Producto'), price, category: { id: categoryId }, ...extra });
      expect(res.status).toBe(201);
      return res.body.data as { id: string; name: string; price: number };
    };

    describe('autenticación', () => {
      it('permite registrarse e iniciar sesión, y protege los recursos', async () => {
        const s = await register();
        expect((await api().get('/api/categories')).status).toBe(401);
        expect((await api().get('/api/categories').set('Authorization', 'Bearer abc')).status).toBe(401);
        expect((await api().get('/api/categories').set(s.auth)).status).toBe(200);
      });

      it('responde 401 idéntico ante credenciales inválidas', async () => {
        const s = await register();
        const unknown = await api().post('/api/auth/login').send({ username: 'nadie-existe', password: PASSWORD });
        const wrong = await api().post('/api/auth/login').send({ username: 'x'.repeat(5), password: 'otra-clave-distinta-123' });
        expect(unknown.status).toBe(401);
        expect(wrong.status).toBe(401);
        expect(unknown.body).toEqual(wrong.body);
        expect(s.token).toBeTruthy();
      });

      it('rechaza contraseñas débiles y usernames repetidos', async () => {
        const s = await register('dup');
        const username = (await api().get(`/api/users/${s.id}`).set(s.auth)).body.data.username;
        const dup = await api().post('/api/auth/signup').send({ name: 'Otro', username, password: PASSWORD });
        expect(dup.status).toBe(409);
        const weak = await api().post('/api/auth/signup').send({ name: 'Otro', username: 'weak.user', password: 'corta' });
        expect(weak.status).toBe(400);
      });

      it('ya no expone logout, cambio de contraseña ni /me', async () => {
        const s = await register();
        expect((await api().post('/api/auth/logout').set(s.auth)).status).toBe(404);
        expect((await api().get('/api/auth/me').set(s.auth)).status).toBe(404);
        expect((await api().patch('/api/auth/password').set(s.auth).send({})).status).toBe(404);
      });
    });

    describe('categorías', () => {
      it('crea, consulta, lista, actualiza y elimina', async () => {
        const s = await register();
        const category = await createCategory(s, uniqueName('Bebidas'));

        const one = await api().get(`/api/categories/${category.id}`).set(s.auth);
        expect(one.status).toBe(200);
        expect(one.body.data).toMatchObject({ id: category.id, productsCount: 0 });

        const list = await api().get('/api/categories').query({ search: category.name }).set(s.auth);
        expect(list.status).toBe(200);
        expect(list.body.pagination.total).toBe(1);
        expect(list.body.data[0]).toMatchObject({ id: category.id, productsCount: 0 });

        const patched = await api().patch(`/api/categories/${category.id}`).set(s.auth).send({ description: 'Nueva' });
        expect(patched.status).toBe(200);
        expect(patched.body.data.description).toBe('Nueva');

        expect((await api().delete(`/api/categories/${category.id}`).set(s.auth)).status).toBe(204);
        expect((await api().get(`/api/categories/${category.id}`).set(s.auth)).status).toBe(404);
      });

      it('rechaza nombres duplicados sin distinguir mayúsculas', async () => {
        const s = await register();
        const category = await createCategory(s, uniqueName('Lácteos'));
        const dup = await api().post('/api/categories').set(s.auth).send({ name: category.name.toUpperCase() });
        expect(dup.status).toBe(409);

        const other = await createCategory(s);
        const clash = await api().patch(`/api/categories/${other.id}`).set(s.auth).send({ name: category.name.toLowerCase() });
        expect(clash.status).toBe(409);
      });

      it('valida cuerpo, id y campos desconocidos', async () => {
        const s = await register();
        expect((await api().post('/api/categories').set(s.auth).send({ name: 'A' })).status).toBe(400);
        expect((await api().post('/api/categories').set(s.auth).send({ name: 'Valida', extra: 1 })).status).toBe(400);
        expect((await api().get('/api/categories/no-es-un-id').set(s.auth)).status).toBe(400);
        expect((await api().get('/api/categories/aaaaaaaaaaaaaaaaaaaaaaaa').set(s.auth)).status).toBe(404);
        const category = await createCategory(s);
        expect((await api().patch(`/api/categories/${category.id}`).set(s.auth).send({})).status).toBe(400);
      });

      it('no se puede eliminar una categoría con productos', async () => {
        const s = await register();
        const category = await createCategory(s);
        const product = await createProduct(s, category.id);

        expect((await api().delete(`/api/categories/${category.id}`).set(s.auth)).status).toBe(409);

        expect((await api().delete(`/api/products/${product.id}`).set(s.auth)).status).toBe(204);
        expect((await api().delete(`/api/categories/${category.id}`).set(s.auth)).status).toBe(204);
      });
    });

    describe('productos', () => {
      it('exige una categoría existente y la devuelve poblada', async () => {
        const s = await register();
        const missing = await api()
          .post('/api/products')
          .set(s.auth)
          .send({ name: 'Sin categoría', price: 5, category: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa' } });
        expect(missing.status).toBe(400);

        const category = await createCategory(s);
        const res = await api()
          .post('/api/products')
          .set(s.auth)
          .send({ name: 'Cafe molido', price: 12.5, category: { id: category.id } });
        expect(res.status).toBe(201);
        expect(res.body.data.categoryId).toBeUndefined();
        expect(res.body.data).toMatchObject({
          name: 'Cafe molido',
          price: 12.5,
          isActive: true,
          category: { id: category.id, name: category.name },
        });
      });

      it('valida precio y campos', async () => {
        const s = await register();
        const category = await createCategory(s);
        const base = { name: 'Producto', category: { id: category.id } };
        for (const price of [0, -1, 1.999, 1_000_001, '10', null]) {
          expect((await api().post('/api/products').set(s.auth).send({ ...base, price })).status).toBe(400);
        }
        expect((await api().post('/api/products').set(s.auth).send({ ...base, price: 5, category: { id: 'xyz' } })).status).toBe(400);
        expect((await api().post('/api/products').set(s.auth).send({ ...base, price: 5, extra: true })).status).toBe(400);
        expect((await api().post('/api/products').set(s.auth).send({ name: 'Producto', price: 5, categoryId: category.id })).status).toBe(400);
        expect((await api().post('/api/products').set(s.auth).send({ name: 'Producto', price: 5, category: category.id })).status).toBe(400);
        expect((await api().post('/api/products').set(s.auth).send({ ...base, price: 5, category: { id: category.id, name: 'x' } })).status).toBe(400);
      });

      it('lista y filtra por categoría, y lista los productos de una categoría', async () => {
        const s = await register();
        const a = await createCategory(s);
        const b = await createCategory(s);
        await createProduct(s, a.id);
        await createProduct(s, a.id);
        await createProduct(s, b.id);

        const byA = await api().get('/api/products').query({ categoryId: a.id }).set(s.auth);
        expect(byA.status).toBe(200);
        expect(byA.body.pagination.total).toBe(2);
        expect(byA.body.data.every((p: { category: { id: string } }) => p.category.id === a.id)).toBe(true);

        const nested = await api().get(`/api/categories/${a.id}/products`).query({ pageSize: 1 }).set(s.auth);
        expect(nested.status).toBe(200);
        expect(nested.body.data).toHaveLength(1);
        expect(nested.body.pagination).toMatchObject({ pageSize: 1, pageCount: 2, total: 2 });

        expect((await api().get('/api/categories/aaaaaaaaaaaaaaaaaaaaaaaa/products').set(s.auth)).status).toBe(404);

        const categoryList = await api().get('/api/categories').query({ search: a.name }).set(s.auth);
        expect(categoryList.body.data[0].productsCount).toBe(2);
      });

      it('permite mover un producto de categoría y actualiza los conteos', async () => {
        const s = await register();
        const a = await createCategory(s);
        const b = await createCategory(s);
        const product = await createProduct(s, a.id);

        const moved = await api().patch(`/api/products/${product.id}`).set(s.auth).send({ category: { id: b.id } });
        expect(moved.status).toBe(200);
        expect(moved.body.data.category).toEqual({ id: b.id, name: b.name });

        expect((await api().get(`/api/categories/${a.id}`).set(s.auth)).body.data.productsCount).toBe(0);
        expect((await api().get(`/api/categories/${b.id}`).set(s.auth)).body.data.productsCount).toBe(1);

        const bad = await api().patch(`/api/products/${product.id}`).set(s.auth).send({ category: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa' } });
        expect(bad.status).toBe(400);
        expect((await api().patch(`/api/products/${product.id}`).set(s.auth).send({})).status).toBe(400);
        expect((await api().patch('/api/products/aaaaaaaaaaaaaaaaaaaaaaaa').set(s.auth).send({ price: 3 })).status).toBe(404);
      });
    });

    describe('órdenes', () => {
      it('crea una orden con total calculado y datos relacionados poblados', async () => {
        const s = await register();
        const category = await createCategory(s);
        const p1 = await createProduct(s, category.id, 19.99);
        const p2 = await createProduct(s, category.id, 0.1);

        const res = await api()
          .post('/api/orders')
          .set(s.auth)
          .send({
            items: [
              { product: { id: p1.id }, quantity: 3 },
              { product: { id: p2.id }, quantity: 3 },
            ],
            notes: 'Entregar por la tarde',
          });

        expect(res.status).toBe(201);
        const order = res.body.data;
        expect(order.status).toBe('pending');
        expect(order.total).toBe(60.27);
        expect(order.user).toMatchObject({ id: s.id });
        expect(order.userId).toBeUndefined();
        expect(order.user.password).toBeUndefined();
        expect(order.items).toHaveLength(2);
        expect(order.items[0].productId).toBeUndefined();
        expect(order.items[0]).toMatchObject({
          productName: p1.name,
          unitPrice: 19.99,
          quantity: 3,
          subtotal: 59.97,
          product: { id: p1.id, name: p1.name, category: { id: category.id, name: category.name } },
        });
      });

      it('conserva el precio de compra aunque el producto cambie', async () => {
        const s = await register();
        const category = await createCategory(s);
        const product = await createProduct(s, category.id, 10);
        const order = (await api().post('/api/orders').set(s.auth).send({ items: [{ product: { id: product.id }, quantity: 2 }] })).body.data;

        await api().patch(`/api/products/${product.id}`).set(s.auth).send({ price: 99, name: 'Renombrado' });

        const fetched = await api().get(`/api/orders/${order.id}`).set(s.auth);
        expect(fetched.status).toBe(200);
        expect(fetched.body.data.total).toBe(20);
        expect(fetched.body.data.items[0]).toMatchObject({ unitPrice: 10, productName: product.name });
        expect(fetched.body.data.items[0].product).toMatchObject({ name: 'Renombrado', price: 99 });
      });

      it('rechaza ítems inválidos, repetidos, inexistentes o no disponibles', async () => {
        const s = await register();
        const category = await createCategory(s);
        const product = await createProduct(s, category.id);
        const inactive = await createProduct(s, category.id, 5, { isActive: false });
        const post = (body: object) => api().post('/api/orders').set(s.auth).send(body);

        expect((await post({ items: [] })).status).toBe(400);
        expect((await post({})).status).toBe(400);
        expect((await post({ items: [{ product: { id: product.id }, quantity: 0 }] })).status).toBe(400);
        expect((await post({ items: [{ product: { id: product.id }, quantity: 1.5 }] })).status).toBe(400);
        expect((await post({ items: [{ product: { id: product.id }, quantity: 1001 }] })).status).toBe(400);
        expect((await post({ items: [{ product: { id: 'abc' }, quantity: 1 }] })).status).toBe(400);
        expect((await post({ items: [{ product: { id: product.id }, quantity: 1, price: 1 }] })).status).toBe(400);
        expect((await post({ items: [{ product: { id: product.id }, quantity: 1 }, { product: { id: product.id }, quantity: 2 }] })).status).toBe(400);
        expect((await post({ items: [{ product: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa' }, quantity: 1 }] })).status).toBe(400);
        expect((await post({ items: [{ product: { id: inactive.id }, quantity: 1 }] })).status).toBe(409);
        expect((await post({ items: [{ product: { id: product.id }, quantity: 1 }], userId: s.id })).status).toBe(400);
      });

      it('cada usuario solo ve y modifica sus propias órdenes', async () => {
        const owner = await register('owner');
        const other = await register('other');
        const category = await createCategory(owner);
        const product = await createProduct(owner, category.id);
        const order = (await api().post('/api/orders').set(owner.auth).send({ items: [{ product: { id: product.id }, quantity: 1 }] })).body.data;

        expect((await api().get(`/api/orders/${order.id}`).set(other.auth)).status).toBe(404);
        expect((await api().patch(`/api/orders/${order.id}`).set(other.auth).send({ status: 'cancelled' })).status).toBe(404);
        expect((await api().delete(`/api/orders/${order.id}`).set(other.auth)).status).toBe(404);
        expect((await api().get('/api/orders').set(other.auth)).body.pagination.total).toBe(0);
        expect((await api().get(`/api/users/${owner.id}/orders`).set(other.auth)).status).toBe(403);
        expect((await api().get(`/api/users/${owner.id}/orders`).set(owner.auth)).body.pagination.total).toBe(1);
      });

      it('lista las órdenes del usuario con paginación y filtro de estado', async () => {
        const s = await register();
        const category = await createCategory(s);
        const product = await createProduct(s, category.id);
        const ids: string[] = [];
        for (let i = 0; i < 3; i += 1) {
          const res = await api().post('/api/orders').set(s.auth).send({ items: [{ product: { id: product.id }, quantity: i + 1 }] });
          ids.push(res.body.data.id);
        }
        await api().patch(`/api/orders/${ids[0]}`).set(s.auth).send({ status: 'completed' });

        const page = await api().get(`/api/users/${s.id}/orders`).query({ pageSize: 2 }).set(s.auth);
        expect(page.status).toBe(200);
        expect(page.body.data).toHaveLength(2);
        expect(page.body.pagination).toMatchObject({ pageSize: 2, pageCount: 2, total: 3 });
        expect(page.body.data[0].id).toBe(ids[2]);
        expect(page.body.data[0].user).toMatchObject({ id: s.id });
        expect(page.body.data[0].items[0].product.category.name).toBe(category.name);

        const completed = await api().get('/api/orders').query({ status: 'completed' }).set(s.auth);
        expect(completed.body.pagination.total).toBe(1);
        expect(completed.body.data[0].id).toBe(ids[0]);

        expect((await api().get('/api/orders').query({ status: 'otro' }).set(s.auth)).status).toBe(400);
        expect((await api().get('/api/orders').query({ pageSize: 1000 }).set(s.auth)).status).toBe(400);
      });

      it('solo permite modificar órdenes pendientes y borrar las no completadas', async () => {
        const s = await register();
        const category = await createCategory(s);
        const product = await createProduct(s, category.id);
        const create = async () =>
          (await api().post('/api/orders').set(s.auth).send({ items: [{ product: { id: product.id }, quantity: 1 }] })).body.data.id as string;

        const first = await create();
        expect((await api().patch(`/api/orders/${first}`).set(s.auth).send({})).status).toBe(400);
        expect((await api().patch(`/api/orders/${first}`).set(s.auth).send({ status: 'pending' })).status).toBe(400);
        const notes = await api().patch(`/api/orders/${first}`).set(s.auth).send({ notes: 'Actualizada' });
        expect(notes.body.data.notes).toBe('Actualizada');
        const done = await api().patch(`/api/orders/${first}`).set(s.auth).send({ status: 'completed' });
        expect(done.body.data.status).toBe('completed');
        expect((await api().patch(`/api/orders/${first}`).set(s.auth).send({ status: 'cancelled' })).status).toBe(409);
        expect((await api().delete(`/api/orders/${first}`).set(s.auth)).status).toBe(409);

        const second = await create();
        await api().patch(`/api/orders/${second}`).set(s.auth).send({ status: 'cancelled' });
        expect((await api().delete(`/api/orders/${second}`).set(s.auth)).status).toBe(204);
        expect((await api().get(`/api/orders/${second}`).set(s.auth)).status).toBe(404);
      });
    });

    describe('integridad referencial', () => {
      it('no permite eliminar un producto que está en una orden, pero sí desactivarlo', async () => {
        const s = await register();
        const category = await createCategory(s);
        const product = await createProduct(s, category.id);
        const order = (await api().post('/api/orders').set(s.auth).send({ items: [{ product: { id: product.id }, quantity: 1 }] })).body.data;

        expect((await api().delete(`/api/products/${product.id}`).set(s.auth)).status).toBe(409);
        const off = await api().patch(`/api/products/${product.id}`).set(s.auth).send({ isActive: false });
        expect(off.body.data.isActive).toBe(false);

        const blocked = await api().post('/api/orders').set(s.auth).send({ items: [{ product: { id: product.id }, quantity: 1 }] });
        expect(blocked.status).toBe(409);

        await api().delete(`/api/orders/${order.id}`).set(s.auth);
        expect((await api().delete(`/api/products/${product.id}`).set(s.auth)).status).toBe(204);
      });

      it('no permite eliminar un usuario con órdenes y revoca su acceso al eliminarlo', async () => {
        const s = await register();
        const category = await createCategory(s);
        const product = await createProduct(s, category.id);
        const order = (await api().post('/api/orders').set(s.auth).send({ items: [{ product: { id: product.id }, quantity: 1 }] })).body.data;

        const other = await register('other');
        expect((await api().delete(`/api/users/${s.id}`).set(other.auth)).status).toBe(403);
        expect((await api().delete(`/api/users/${s.id}`).set(s.auth)).status).toBe(409);

        await api().delete(`/api/orders/${order.id}`).set(s.auth);
        expect((await api().delete(`/api/users/${s.id}`).set(s.auth)).status).toBe(204);
        expect((await api().get('/api/categories').set(s.auth)).status).toBe(401);
        expect((await api().get(`/api/users/${s.id}`).set(other.auth)).status).toBe(404);
      });
    });

    describe('usuarios', () => {
      it('lista, consulta y actualiza solo el propio usuario', async () => {
        const a = await register('ana');
        const b = await register('beto');

        const list = await api().get('/api/users').query({ pageSize: 100 }).set(a.auth);
        expect(list.status).toBe(200);
        expect(list.body.data.some((u: { id: string }) => u.id === b.id)).toBe(true);
        expect(JSON.stringify(list.body)).not.toContain('scrypt');

        expect((await api().patch(`/api/users/${b.id}`).set(a.auth).send({ name: 'Intruso' })).status).toBe(403);
        const own = await api().patch(`/api/users/${a.id}`).set(a.auth).send({ name: 'Nombre Nuevo' });
        expect(own.status).toBe(200);
        expect(own.body.data.name).toBe('Nombre Nuevo');
      });
    });
  });
};
