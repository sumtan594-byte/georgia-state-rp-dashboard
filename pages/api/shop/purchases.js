import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { addMemberRole } from '../../../lib/discord-v2';
import { getPool } from '../../../lib/appdb';
import { getLinkedRobloxUser } from '../../../lib/linked-roblox-user';
import { findShopProduct, PRODUCT_LIST, SHOP_SUPPORT_CHANNEL_URL } from '../../../lib/shop-catalog';

const ROBLOX_ITEM_TYPE_GAME_PASS = 1;
const NICE_TRY_MESSAGE = 'Nice try! But you have not actually purchased the gamepass. Please purchase it before pressing this button. Check your linked account at the top to ensure you are on the right account.';

async function checkGamePassOwnership(robloxUserId, gamePassId) {
  const response = await fetch(
    `https://inventory.roblox.com/v1/users/${robloxUserId}/items/${ROBLOX_ITEM_TYPE_GAME_PASS}/${gamePassId}/is-owned`,
    {
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        'cache-control': 'no-cache',
      },
    }
  );

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Roblox ownership check failed for ${gamePassId}: ${response.status} ${details}`);
  }

  return response.json();
}

function serializeProductStatus(product, owned) {
  return {
    id: product.id,
    gamePassId: product.gamePassId,
    owned: Boolean(owned),
  };
}

async function getUserPurchaseStatus(robloxUserId) {
  const results = await Promise.all(
    PRODUCT_LIST.map(async product => {
      try {
        const owned = await checkGamePassOwnership(robloxUserId, product.gamePassId);
        return serializeProductStatus(product, owned);
      } catch (error) {
        console.error('[Shop Ownership Check]', error);
        return { ...serializeProductStatus(product, false), error: 'Failed to check ownership' };
      }
    })
  );

  return Object.fromEntries(results.map(result => [result.id, result]));
}

async function rewardProduct(product, discordUserId) {
  if (product.rewardType === 'support') {
    return {
      action: 'support',
      message: 'Purchase verified. Please request your ad in the support channel.',
      redirectUrl: SHOP_SUPPORT_CHANNEL_URL,
    };
  }

  if (product.rewardType === 'roles' && product.roleIds?.length) {
    const guildId = process.env.ALLOWED_GUILD_ID || '1366688107788894280';
    await Promise.all(product.roleIds.map(roleId => addMemberRole(guildId, discordUserId, roleId)));
    return {
      action: 'roles',
      message: 'Purchase verified. Your Discord roles have been updated.',
      roleIds: product.roleIds,
    };
  }

  return {
    action: 'none',
    message: 'Purchase verified. Thank you for supporting GSRP!',
  };
}

async function reserveRoleClaim(discordUserId, productId) {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database connection is not configured.');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shop_claims (
      discord_id VARCHAR(255) NOT NULL,
      product_id VARCHAR(255) NOT NULL,
      claimed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (discord_id, product_id)
    )
  `);

  const [result] = await pool.query(
    'INSERT IGNORE INTO shop_claims (discord_id, product_id) VALUES (?, ?)',
    [discordUserId, productId]
  );

  return result.affectedRows === 1;
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const linkedUser = await getLinkedRobloxUser(session.user.id);

    if (!linkedUser.linked) {
      return res.status(200).json({
        linked: false,
        message: 'No verified Roblox account is linked to this Discord account.',
        purchases: {},
      });
    }

    if (linkedUser.error || !linkedUser.roblox?.id) {
      return res.status(200).json({
        linked: true,
        robloxUsername: linkedUser.robloxUsername,
        error: linkedUser.error || 'Could not resolve linked Roblox account.',
        purchases: {},
      });
    }

    if (req.method === 'GET') {
      const purchases = await getUserPurchaseStatus(linkedUser.roblox.id);
      return res.status(200).json({
        linked: true,
        roblox: linkedUser.roblox,
        purchases,
      });
    }

    const { productId } = req.body || {};
    const product = findShopProduct(productId);

    if (!product) {
      return res.status(400).json({ error: 'Unknown shop product.' });
    }

    const owned = await checkGamePassOwnership(linkedUser.roblox.id, product.gamePassId);
    if (!owned) {
      return res.status(200).json({
        owned: false,
        message: NICE_TRY_MESSAGE,
        roblox: linkedUser.roblox,
        productId: product.id,
        gamePassId: product.gamePassId,
      });
    }

    let reward;
    if (product.rewardType === 'roles') {
      const isFirstClaim = await reserveRoleClaim(session.user.id, product.id);
      if (isFirstClaim) {
        reward = await rewardProduct(product, session.user.id);
      } else {
        reward = {
          action: 'roles',
          alreadyClaimed: true,
          message: 'Purchase verified. Your Discord roles are already unlocked.',
          roleIds: product.roleIds || [],
        };
      }
    } else {
      reward = await rewardProduct(product, session.user.id);
    }

    return res.status(200).json({
      owned: true,
      productId: product.id,
      roblox: linkedUser.roblox,
      ...reward,
    });
  } catch (error) {
    console.error('[Shop Purchases API]', error);
    return res.status(500).json({ error: 'Failed to verify purchase. Please try again in a moment.' });
  }
}
