/** India states/UTs used for profile location defaults. */
const INDIA_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
]

const DEFAULT_GENDER = "I'd prefer not to say"

const ALIASES = {
  orissa: 'Odisha',
  'uttaranchal': 'Uttarakhand',
  'nct of delhi': 'Delhi',
  'new delhi': 'Delhi',
  bom: 'Maharashtra',
  mumbai: 'Maharashtra',
  pune: 'Maharashtra',
  bengaluru: 'Karnataka',
  bangalore: 'Karnataka',
  mysore: 'Karnataka',
  chennai: 'Tamil Nadu',
  madras: 'Tamil Nadu',
  hyderabad: 'Telangana',
  kolkata: 'West Bengal',
  calcutta: 'West Bengal',
  ahmedabad: 'Gujarat',
  surat: 'Gujarat',
  jaipur: 'Rajasthan',
  lucknow: 'Uttar Pradesh',
  noida: 'Uttar Pradesh',
  gurgaon: 'Haryana',
  gurugram: 'Haryana',
  chandigarh: 'Punjab',
  indore: 'Madhya Pradesh',
  bhopal: 'Madhya Pradesh',
  koichi: 'Kerala',
  kochi: 'Kerala',
  cochin: 'Kerala',
  trivandrum: 'Kerala',
  thiruvananthapuram: 'Kerala',
}

/**
 * Best-effort extract of an Indian state/UT from free-text address / city.
 */
function extractIndiaState(text = '') {
  const raw = String(text || '').trim()
  if (!raw) return ''

  const lower = raw.toLowerCase()

  // Prefer longer state names first (e.g. "Madhya Pradesh" before "Pradesh")
  const sorted = [...INDIA_STATES].sort((a, b) => b.length - a.length)
  for (const state of sorted) {
    if (lower.includes(state.toLowerCase())) return state
  }

  for (const [alias, state] of Object.entries(ALIASES)) {
    if (lower.includes(alias)) return state
  }

  return ''
}

module.exports = {
  INDIA_STATES,
  DEFAULT_GENDER,
  extractIndiaState,
}
