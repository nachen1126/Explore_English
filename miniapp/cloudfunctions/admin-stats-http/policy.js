'use strict';

async function verifyAdministrator({ token, verifyToken, findAdministrator }) {
  if (!token) return null;
  const identity = await verifyToken(token);
  if (!identity?.id) return null;
  const administrator = await findAdministrator(`supabase:${identity.id}`);
  return administrator?.enabled === true ? identity : null;
}

module.exports = { verifyAdministrator };
