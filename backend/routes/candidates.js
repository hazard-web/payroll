const express = require('express')
const { auth } = require('./auth')
const Candidate = require('../models/Candidate')
const { isPulseAdmin, orgIdOf } = require('../utils/pulseAuth')

const router = express.Router()

const STATUSES = ['Draft', 'Not started', 'In progress', 'Offer sent', 'Joined', 'Withdrawn']
const MAX_FILE_BYTES = 5 * 1024 * 1024
const PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg', 'image/webp']
const LETTER_MIMES = [
  ...PHOTO_MIMES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

function isId(value) {
  return /^[a-fA-F0-9]{24}$/.test(String(value || ''))
}

function requireAdmin(req, res, next) {
  if (!isPulseAdmin(req.user)) {
    return res.status(403).json({ success: false, message: 'Admin access required' })
  }
  return next()
}

function actorName(user) {
  const n = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return n || user.displayName || user.email || 'Admin'
}

function fileMeta(file) {
  if (!file || !file.name) return null
  return {
    name: file.name,
    mime: file.mime || '',
    size: file.size || 0,
    hasFile: Boolean(file.data),
  }
}

function toListItem(doc) {
  const row = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc }
  return {
    _id: row._id,
    candidateId: row.candidateId || '',
    status: row.status || 'Draft',
    firstName: row.firstName || '',
    lastName: row.lastName || '',
    email: row.email || '',
    officialEmail: row.officialEmail || '',
    phone: row.phone || '',
    countryCode: row.countryCode || '+91',
    uan: row.uan || '',
    aadhaar: row.aadhaar || '',
    pan: row.pan || '',
    department: row.department || '',
    sourceOfHire: row.sourceOfHire || '',
    workLocation: row.workLocation || '',
    title: row.title || '',
    experienceYears: row.experienceYears || '',
    skillSet: row.skillSet || '',
    highestQualification: row.highestQualification || '',
    currentSalary: row.currentSalary || '',
    additionalInfo: row.additionalInfo || '',
    tentativeJoiningDate: row.tentativeJoiningDate || null,
    photo: fileMeta(row.photo),
    offerLetter: fileMeta(row.offerLetter),
    addedByName: row.addedByName || '',
    modifiedByName: row.modifiedByName || '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toDetail(doc) {
  const row = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc }
  return {
    ...toListItem(row),
    presentAddress: row.presentAddress || {},
    permanentAddress: row.permanentAddress || {},
    sameAsPresent: Boolean(row.sameAsPresent),
    education: row.education || [],
    experience: row.experience || [],
    photo: row.photo && row.photo.data ? row.photo : fileMeta(row.photo),
    offerLetter: row.offerLetter && row.offerLetter.data ? row.offerLetter : fileMeta(row.offerLetter),
  }
}

function cleanStr(value) {
  return String(value == null ? '' : value).trim()
}

function sanitizeFile(file, allowedMimes) {
  if (!file || typeof file !== 'object') return undefined
  const name = cleanStr(file.name)
  const data = cleanStr(file.data)
  if (!name && !data) return undefined
  const size = Number(file.size) || 0
  const mime = cleanStr(file.mime).toLowerCase()
  if (size > MAX_FILE_BYTES) {
    const err = new Error('File is larger than 5 MB')
    err.status = 400
    throw err
  }
  if (data && data.length > MAX_FILE_BYTES * 1.4) {
    const err = new Error('File is larger than 5 MB')
    err.status = 400
    throw err
  }
  if (mime && allowedMimes.length && !allowedMimes.includes(mime) && !mime.startsWith('image/')) {
    const err = new Error('This file type is not supported')
    err.status = 400
    throw err
  }
  return { name, mime, size, data }
}

function sanitizeAddress(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  return {
    line1: cleanStr(src.line1),
    line2: cleanStr(src.line2),
    city: cleanStr(src.city),
    country: cleanStr(src.country) || 'India',
    state: cleanStr(src.state),
    postalCode: cleanStr(src.postalCode),
  }
}

function sanitizeRows(list, keys) {
  if (!Array.isArray(list)) return []
  return list
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const next = {}
      keys.forEach((key) => {
        next[key] = cleanStr(row[key])
      })
      const hasValue = keys.some((key) => next[key])
      return hasValue ? next : null
    })
    .filter(Boolean)
}

function pickPayload(body, { keepFiles }) {
  const status = STATUSES.includes(body.status) ? body.status : undefined
  const payload = {
    firstName: cleanStr(body.firstName),
    lastName: cleanStr(body.lastName),
    email: cleanStr(body.email).toLowerCase(),
    officialEmail: cleanStr(body.officialEmail).toLowerCase(),
    phone: cleanStr(body.phone),
    countryCode: cleanStr(body.countryCode) || '+91',
    uan: cleanStr(body.uan),
    aadhaar: cleanStr(body.aadhaar),
    pan: cleanStr(body.pan).toUpperCase(),
    presentAddress: sanitizeAddress(body.presentAddress),
    permanentAddress: sanitizeAddress(body.permanentAddress),
    sameAsPresent: Boolean(body.sameAsPresent),
    experienceYears: cleanStr(body.experienceYears),
    sourceOfHire: cleanStr(body.sourceOfHire),
    skillSet: cleanStr(body.skillSet),
    highestQualification: cleanStr(body.highestQualification),
    additionalInfo: cleanStr(body.additionalInfo),
    workLocation: cleanStr(body.workLocation),
    title: cleanStr(body.title),
    currentSalary: cleanStr(body.currentSalary),
    department: cleanStr(body.department),
    tentativeJoiningDate: body.tentativeJoiningDate ? new Date(body.tentativeJoiningDate) : null,
    education: sanitizeRows(body.education, [
      'schoolName',
      'degree',
      'fieldOfStudy',
      'dateOfCompletion',
      'additionalNotes',
    ]),
    experience: sanitizeRows(body.experience, [
      'occupation',
      'company',
      'summary',
      'duration',
      'currentlyWorkHere',
    ]),
  }
  if (status) payload.status = status
  if (payload.sameAsPresent) payload.permanentAddress = { ...payload.presentAddress }
  if (keepFiles) {
    if (body.photo !== undefined) payload.photo = sanitizeFile(body.photo, PHOTO_MIMES)
    if (body.offerLetter !== undefined) payload.offerLetter = sanitizeFile(body.offerLetter, LETTER_MIMES)
  }
  return payload
}

async function nextCandidateId(organizationId) {
  const count = await Candidate.countDocuments({ organizationId })
  return `CAND-${String(count + 1).padStart(4, '0')}`
}

router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const organizationId = orgIdOf(req.user)
    const q = cleanStr(req.query.q).toLowerCase()
    const department = cleanStr(req.query.department)
    const location = cleanStr(req.query.location)
    const status = cleanStr(req.query.status)
    const scope = cleanStr(req.query.scope) || 'all'
    const filter = { organizationId }
    if (department && department !== 'all') filter.department = department
    if (location && location !== 'all') filter.workLocation = location
    if (status && STATUSES.includes(status)) filter.status = status
    if (scope === 'mine') filter.addedBy = req.user._id

    let rows = await Candidate.find(filter).sort({ createdAt: -1 }).limit(500).lean()
    if (q) {
      rows = rows.filter((row) => {
        const blob = [
          row.firstName,
          row.lastName,
          row.email,
          row.officialEmail,
          row.phone,
          row.candidateId,
          row.department,
        ]
          .join(' ')
          .toLowerCase()
        return blob.includes(q)
      })
    }

    const departments = [...new Set(rows.map((r) => r.department).filter(Boolean))].sort()
    const locations = [...new Set(rows.map((r) => r.workLocation).filter(Boolean))].sort()

    res.json({
      success: true,
      data: {
        candidates: rows.map(toListItem),
        departments,
        locations,
        statuses: STATUSES,
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load candidates' })
  }
})

router.get('/:id', auth, requireAdmin, async (req, res) => {
  try {
    if (!isId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid candidate' })
    }
    const organizationId = orgIdOf(req.user)
    const row = await Candidate.findOne({ _id: req.params.id, organizationId })
    if (!row) return res.status(404).json({ success: false, message: 'Candidate not found' })
    res.json({ success: true, data: toDetail(row) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load candidate' })
  }
})

router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const organizationId = orgIdOf(req.user)
    const asDraft = Boolean(req.body.draft)
    const payload = pickPayload(req.body, { keepFiles: true })
    if (!asDraft) {
      if (!payload.firstName || !payload.lastName || !payload.email || !payload.phone) {
        return res.status(400).json({
          success: false,
          message: 'First name, last name, email, and phone are required',
        })
      }
    }
    payload.status = asDraft ? 'Draft' : payload.status && payload.status !== 'Draft' ? payload.status : 'Not started'
    const name = actorName(req.user)
    const row = await Candidate.create({
      ...payload,
      organizationId,
      candidateId: await nextCandidateId(organizationId),
      addedBy: req.user._id,
      addedByName: name,
      modifiedBy: req.user._id,
      modifiedByName: name,
    })
    res.status(201).json({
      success: true,
      message: asDraft ? 'Draft saved' : 'Candidate added',
      data: toListItem(row),
    })
  } catch (err) {
    const status = err.status || 500
    res.status(status).json({ success: false, message: err.message || 'Failed to add candidate' })
  }
})

router.patch('/:id', auth, requireAdmin, async (req, res) => {
  try {
    if (!isId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid candidate' })
    }
    const organizationId = orgIdOf(req.user)
    const row = await Candidate.findOne({ _id: req.params.id, organizationId })
    if (!row) return res.status(404).json({ success: false, message: 'Candidate not found' })
    const asDraft = Boolean(req.body.draft)
    const payload = pickPayload(req.body, { keepFiles: true })
    if (!asDraft && req.body.draft !== true) {
      const firstName = payload.firstName || row.firstName
      const lastName = payload.lastName || row.lastName
      const email = payload.email || row.email
      const phone = payload.phone || row.phone
      if (!firstName || !lastName || !email || !phone) {
        return res.status(400).json({
          success: false,
          message: 'First name, last name, email, and phone are required',
        })
      }
    }
    if (asDraft && !payload.status) payload.status = 'Draft'
    if (!asDraft && payload.status === 'Draft') payload.status = 'Not started'
    Object.assign(row, payload)
    row.modifiedBy = req.user._id
    row.modifiedByName = actorName(req.user)
    await row.save()
    res.json({ success: true, message: asDraft ? 'Draft saved' : 'Candidate updated', data: toListItem(row) })
  } catch (err) {
    const status = err.status || 500
    res.status(status).json({ success: false, message: err.message || 'Failed to update candidate' })
  }
})

router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    if (!isId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid candidate' })
    }
    const organizationId = orgIdOf(req.user)
    const row = await Candidate.findOneAndDelete({ _id: req.params.id, organizationId })
    if (!row) return res.status(404).json({ success: false, message: 'Candidate not found' })
    res.json({ success: true, message: 'Candidate removed' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to remove candidate' })
  }
})

module.exports = router
