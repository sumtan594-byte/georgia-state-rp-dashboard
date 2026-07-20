import { getPublicProducts } from '../../../lib/shop-products-db';

// Public storefront catalog. Returns only enabled products, grouped by
// category, with the ordered category/tab metadata. Polled by the shop
// page so admin changes relay in near real time.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { products, categories } = await getPublicProducts();
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
    return res.status(200).json({ products, categories });
  } catch (error) {
    console.error('[Shop Products API]', error.message);
    return res.status(500).json({ error: 'Failed to load shop products.' });
  }
}
