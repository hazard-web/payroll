export const COMPANY_EMAIL_DOMAIN = 'bda.co.in'

export function isCompanyEmail(email) {
  const domain = String(email || '')
    .trim()
    .toLowerCase()
    .split('@')[1]
  return domain === COMPANY_EMAIL_DOMAIN
}

export function companyEmailRequiredMessage() {
  return `This workspace is invite-only for @${COMPANY_EMAIL_DOMAIN} accounts. Personal email cannot sign in.`
}
