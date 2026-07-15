import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { getPublicProducts } from '../../../lib/shop-products-db';

// Public storefront catalog. Returns only enabled products, grouped by
// category, with the ordered category/tab metadata. Polled by the shop
// page so admin changes relay in near real time.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { products, categories } = await getPublicProducts();
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json({ products, categories });
  } catch (error) {
    console.error('[Shop Products API]', error.message);
    return res.status(500).json({ error: 'Failed to load shop products.' });
  }
}
