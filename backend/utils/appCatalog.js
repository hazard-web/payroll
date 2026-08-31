const { normalizeEmail } = require('./companyDomain')

function slugAppId(name) {
  const slug = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || `app-${Date.now()}`
}

function iconFromUrl(url) {
  try {
    const host = new URL(String(url || '')).hostname
    return host ? `https://www.google.com/s2/favicons?domain=${host}&sz=64` : ''
  } catch {
    return ''
  }
}

function hydrateGrant(grant) {
  return {
    id: String(grant._id),
    appId: grant.appId,
    name: grant.name || grant.appId,
    url: grant.url || '',
    color: grant.color || '#1A5F4A',
    iconUrl: grant.iconUrl || iconFromUrl(grant.url),
    email: grant.email,
    source: grant.source || 'manual',
    googleClientId: grant.googleClientId || '',
  }
}

/** Every active app granted to this employee email. */
async function listActiveGrantsForEmail(email) {
  const EmployeeAppGrant = require('../models/EmployeeAppGrant')
  const normalized = normalizeEmail(email)
  if (!normalized) return []
  const rows = await EmployeeAppGrant.find({
    email: normalized,
    status: 'active',
  })
    .sort({ name: 1 })
    .lean()
  return rows.map(hydrateGrant)
}

module.exports = {
  normalizeEmail,
  slugAppId,
  iconFromUrl,
  hydrateGrant,
  listActiveGrantsForEmail,
}
