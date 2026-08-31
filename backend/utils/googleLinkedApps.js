const https = require('https')
const { URL } = require('url')
const jwt = require('jsonwebtoken')
const { slugAppId, iconFromUrl, hydrateGrant } = require('./appCatalog')

const DIRECTORY_SCOPE = 'https://www.googleapis.com/auth/admin.directory.user.security'
const SYNC_TTL_MS = 15 * 60 * 1000

const HOMEPAGES = {
  atlassian: 'https://www.atlassian.com',
  jira: 'https://www.atlassian.com',
  confluence: 'https://www.atlassian.com',
  claude: 'https://claude.ai',
  anthropic: 'https://claude.ai',
  'cloudflare dashboard': 'https://dash.cloudflare.com',
  cloudflare: 'https://dash.cloudflare.com',
  'cloudinary console': 'https://console.cloudinary.com',
  cloudinary: 'https://console.cloudinary.com',
  'craftmypdf.com': 'https://craftmypdf.com',
  craftmypdf: 'https://craftmypdf.com',
  cursor: 'https://cursor.com',
  github: 'https://github.com',
  gitlab: 'https://gitlab.com',
  slack: 'https://slack.com',
  notion: 'https://www.notion.so',
  figma: 'https://www.figma.com',
  zoom: 'https://zoom.us',
  asana: 'https://app.asana.com',
  linear: 'https://linear.app',
  notion: 'https://www.notion.so',
  openai: 'https://chatgpt.com',
  chatgpt: 'https://chatgpt.com',
  midjourney: 'https://www.midjourney.com',
  dropbox: 'https://www.dropbox.com',
  box: 'https://app.box.com',
  docusign: 'https://www.docusign.com',
  hubspot: 'https://app.hubspot.com',
  salesforce: 'https://login.salesforce.com',
  zendesk: 'https://www.zendesk.com',
  intercom: 'https://www.intercom.com',
  canva: 'https://www.canva.com',
  miro: 'https://miro.com',
  trello: 'https://trello.com',
  monday: 'https://monday.com',
  clickup: 'https://app.clickup.com',
  vercel: 'https://vercel.com',
  netlify: 'https://app.netlify.com',
  stripe: 'https://dashboard.stripe.com',
  twilio: 'https://console.twilio.com',
  sendgrid: 'https://app.sendgrid.com',
}

function requestJson(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const payload = body == null ? null : String(body)
    const reqHeaders = { Accept: 'application/json', ...headers }
    if (payload) reqHeaders['Content-Length'] = Buffer.byteLength(payload)

    const req = https.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || 443,
        path: `${u.pathname}${u.search}`,
        method,
        headers: reqHeaders,
        family: 4,
        timeout: 20000,
      },
      (res) => {
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8')
          let data = {}
          try {
            data = raw ? JSON.parse(raw) : {}
          } catch {
            data = { error: raw.slice(0, 400) }
          }
          if (res.statusCode >= 400) {
            const err = new Error(data.error_description || data.error?.message || data.message || `Google API ${res.statusCode}`)
            err.status = res.statusCode
            err.data = data
            reject(err)
            return
          }
          resolve(data)
        })
      },
    )
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('Google API timed out')))
    if (payload) req.write(payload)
    req.end()
  })
}

function homepageFor(name) {
  const key = String(name || '')
    .trim()
    .toLowerCase()
  if (HOMEPAGES[key]) return HOMEPAGES[key]
  const hit = Object.keys(HOMEPAGES).find((k) => key.includes(k) || k.includes(key))
  if (hit) return HOMEPAGES[hit]
  if (key.includes('.') && !key.includes(' ')) return `https://${key.replace(/^https?:\/\//, '')}`
  return `https://www.google.com/search?q=${encodeURIComponent(name || '')}`
}

function workspaceSa() {
  const raw = process.env.GOOGLE_WORKSPACE_SA_JSON || ''
  if (!raw.trim()) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function accessTokenFromRefresh(refreshToken) {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  const data = await requestJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  return data.access_token
}

async function accessTokenFromServiceAccount() {
  const sa = workspaceSa()
  const adminEmail = String(process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL || '').trim()
  if (!sa?.client_email || !sa?.private_key || !adminEmail) return null

  const now = Math.floor(Date.now() / 1000)
  const assertion = jwt.sign(
    {
      iss: sa.client_email,
      sub: adminEmail,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3500,
      scope: DIRECTORY_SCOPE,
    },
    sa.private_key,
    { algorithm: 'RS256' },
  )
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  })
  const data = await requestJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  return data.access_token
}

async function directoryAccessToken(user) {
  const fromSa = await accessTokenFromServiceAccount().catch(() => null)
  if (fromSa) return fromSa
  const refresh = user?.googleWorkspace?.refreshToken
  if (refresh) return accessTokenFromRefresh(refresh)
  return null
}

function orgIdOf(user) {
  if (!user) return null
  if (user.organizationId) return String(user.organizationId)
  return user._id ? String(user._id) : null
}

async function listDirectoryTokens(accessToken, email) {
  const url = `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(email)}/tokens`
  const data = await requestJson(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return Array.isArray(data.items) ? data.items : []
}

function tokenToGrantFields(item) {
  const name = String(item.displayText || item.clientId || 'Google app').trim()
  const url = homepageFor(name)
  const clientId = String(item.clientId || slugAppId(name))
  return {
    appId: `google-${slugAppId(clientId)}`.slice(0, 120),
    name,
    url,
    iconUrl: iconFromUrl(url),
    color: '#1A5F4A',
    source: 'google',
    googleClientId: clientId,
    googleScopes: Array.isArray(item.scopes) ? item.scopes : [],
  }
}

async function syncGoogleLinkedApps(user, { force = false } = {}) {
  const User = require('../models/User')
  const EmployeeAppGrant = require('../models/EmployeeAppGrant')
  const email = String(user.email || '').toLowerCase()
  const organizationId = orgIdOf(user)
  if (!email || !organizationId) {
    return { apps: [], imported: 0, source: 'none', message: 'No company user to import for' }
  }

  const fresh = await User.findById(user._id).select('+googleWorkspace.refreshToken googleWorkspace')
  const lastSync = fresh?.googleWorkspace?.lastSyncAt ? new Date(fresh.googleWorkspace.lastSyncAt).getTime() : 0
  if (!force && lastSync && Date.now() - lastSync < SYNC_TTL_MS) {
    const rows = await EmployeeAppGrant.find({
      organizationId,
      email,
      status: 'active',
      source: 'google',
    })
      .sort({ name: 1 })
      .lean()
    return {
      apps: rows.map(hydrateGrant),
      imported: rows.length,
      source: 'cache',
      connected: !!(workspaceSa() || fresh?.googleWorkspace?.refreshToken),
    }
  }

  let accessToken
  try {
    accessToken = await directoryAccessToken(fresh || user)
  } catch (err) {
    const message = err.message || 'Could not talk to Google'
    if (fresh) {
      fresh.googleWorkspace = fresh.googleWorkspace || {}
      fresh.googleWorkspace.lastError = message
      fresh.googleWorkspace.lastSyncAt = new Date()
      await fresh.save()
    }
    return {
      apps: [],
      imported: 0,
      source: 'error',
      connected: false,
      message,
    }
  }

  if (!accessToken) {
    return {
      apps: [],
      imported: 0,
      source: 'none',
      connected: false,
      message:
        'Google Account linked apps are not available from Sign in with Google. Connect Google Workspace admin access to import them.',
    }
  }

  let items
  try {
    items = await listDirectoryTokens(accessToken, email)
  } catch (err) {
    const message =
      err.status === 403
        ? 'Google Workspace admin access is required to read Sign in with Google apps. The list on myaccount.google.com cannot be read with email/profile sign-in.'
        : err.message || 'Could not list Google linked apps'
    if (fresh) {
      fresh.googleWorkspace = fresh.googleWorkspace || {}
      fresh.googleWorkspace.lastError = message
      fresh.googleWorkspace.lastSyncAt = new Date()
      await fresh.save()
    }
    return { apps: [], imported: 0, source: 'error', connected: true, message }
  }

  const seen = new Set()
  const upserted = []
  for (const item of items) {
    const fields = tokenToGrantFields(item)
    seen.add(fields.appId)
    const grant = await EmployeeAppGrant.findOneAndUpdate(
      { organizationId, email, appId: fields.appId },
      {
        organizationId,
        email,
        grantedBy: user._id,
        status: 'active',
        ...fields,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    upserted.push(hydrateGrant(grant))
  }

  const stale = await EmployeeAppGrant.find({
    organizationId,
    email,
    source: 'google',
    status: 'active',
    appId: { $nin: [...seen] },
  })
  for (const row of stale) {
    row.status = 'revoked'
    await row.save()
  }

  if (fresh) {
    fresh.googleWorkspace = fresh.googleWorkspace || {}
    fresh.googleWorkspace.connected = true
    fresh.googleWorkspace.lastSyncAt = new Date()
    fresh.googleWorkspace.lastError = ''
    await fresh.save()
  }

  upserted.sort((a, b) => String(a.name).localeCompare(String(b.name)))
  return {
    apps: upserted,
    imported: upserted.length,
    source: 'google',
    connected: true,
    message: upserted.length
      ? `Imported ${upserted.length} Sign in with Google app${upserted.length === 1 ? '' : 's'}`
      : 'Google Workspace returned no Sign in with Google apps for this email',
  }
}

function saveWorkspaceRefreshToken(user, refreshToken) {
  if (!user || !refreshToken) return user
  user.googleWorkspace = user.googleWorkspace || {}
  user.googleWorkspace.refreshToken = refreshToken
  user.googleWorkspace.connected = true
  user.googleWorkspace.lastError = ''
  return user
}

module.exports = {
  DIRECTORY_SCOPE,
  canImportGoogleApps: () => !!(workspaceSa() && process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL),
  syncGoogleLinkedApps,
  saveWorkspaceRefreshToken,
  homepageFor,
}
