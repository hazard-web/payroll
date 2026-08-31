const PLATFORM_DOMAIN = String(process.env.ALLOWED_EMAIL_DOMAIN || 'bda.co.in')
  .trim()
  .toLowerCase()
  .replace(/^@/, '')

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function domainFromEmail(email) {
  const domain = normalizeEmail(email).split('@')[1] || ''
  return domain.replace(/^@/, '')
}

function normalizeDomain(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .replace(/^www\./, '')
}

function allowedEmailDomain() {
  return PLATFORM_DOMAIN || 'bda.co.in'
}

function isAllowedCompanyEmail(email) {
  return domainFromEmail(email) === allowedEmailDomain()
}

function companyEmailRequiredMessage() {
  const domain = allowedEmailDomain()
  return `This workspace is invite-only for @${domain} accounts. Personal email cannot sign in.`
}

function resolveCompanyDomain() {
  return allowedEmailDomain()
}

function emailMatchesDomain(email, domain) {
  const d = normalizeDomain(domain) || allowedEmailDomain()
  return domainFromEmail(email) === d
}

function assertAllowedCompanyEmail(email) {
  if (isAllowedCompanyEmail(email)) {
    return { ok: true, domain: allowedEmailDomain() }
  }
  return {
    ok: false,
    domain: allowedEmailDomain(),
    message: companyEmailRequiredMessage(),
  }
}

module.exports = {
  PLATFORM_DOMAIN,
  normalizeEmail,
  domainFromEmail,
  normalizeDomain,
  allowedEmailDomain,
  isAllowedCompanyEmail,
  companyEmailRequiredMessage,
  resolveCompanyDomain,
  emailMatchesDomain,
  assertAllowedCompanyEmail,
}
