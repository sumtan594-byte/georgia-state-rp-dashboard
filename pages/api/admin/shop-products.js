import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { getAllAdminIds } from '../../../lib/admin-helper';
import { fetchDiscordRoles } from '../../../lib/auth-config';
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  REWARD_TYPES,
} from '../../../lib/shop-products-db';

// Full CRUD for shop products. System administrators only, the same set
// that populates session.user.isAdmin (ADMIN_USER_IDS env + admins collection).
export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const adminIds = await getAllAdminIds();
  if (!adminIds.includes(String(session.user.id))) {
    return res.status(403).json({ error: 'Forbidden, system administrators only' });
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    if (req.method === 'GET') {
      const [products, roles] = await Promise.all([getAllProducts(), fetchDiscordRoles()]);
      return res.status(200).json({
        products,
        roles,
        meta: {
          categoryOrder: CATEGORY_ORDER,
          categoryLabels: CATEGORY_LABELS,
          rewardTypes: REWARD_TYPES,
        },
      });
    }

    if (req.method === 'POST') {
      const { error, product } = await createProduct(req.body || {});
      if (error) return res.status(400).json({ error });
      logChange(session, 'created', product);
      return res.status(201).json({ product });
    }

    if (req.method === 'PUT') {
      const id = req.body?._id || req.query?.id;
      if (!id) return res.status(400).json({ error: 'Product _id is required.' });
      const { error, product } = await updateProduct(id, req.body || {});
      if (error) return res.status(400).json({ error });
      logChange(session, 'updated', product);
      return res.status(200).json({ product });
    }

    if (req.method === 'DELETE') {
      const id = req.body?._id || req.query?.id;
      if (!id) return res.status(400).json({ error: 'Product _id is required.' });
      const { error, deleted } = await deleteProduct(id);
      if (error) return res.status(400).json({ error });
      console.log(`[Shop Admin] ${session.user.name} (${session.user.id}) deleted product ${id}`);
      return res.status(200).json({ deleted });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[Shop Admin API]', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function logChange(session, action, product) {
  console.log(
    `[Shop Admin] ${session.user.name} (${session.user.id}) ${action} product ` +
    `${product?.productId || product?._id} (${product?.name})`,
  );
}
