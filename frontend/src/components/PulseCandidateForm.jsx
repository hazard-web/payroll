import { useEffect, useMemo } from 'react'
import {
  Button,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
  Space,
  Typography,
  Upload,
} from 'antd'
import { DeleteOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

export const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

export const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Singapore', 'United Arab Emirates']
export const DEPARTMENTS = ['Engineering', 'Human Resources', 'Finance', 'Operations', 'Sales', 'Design', 'Product', 'Support']
export const LOCATIONS = ['Ghaziabad', 'Noida', 'Delhi NCR', 'Bengaluru', 'Remote', 'Hybrid']
export const TITLES = ['Software Engineer', 'HR Executive', 'Intern', 'Manager', 'Team Lead', 'Associate', 'Analyst']
export const HIRE_SOURCES = ['Referral', 'Job board', 'Campus', 'Agency', 'Direct', 'Career page']
export const COUNTRY_CODES = [
  { value: '+91', label: '+91' },
  { value: '+1', label: '+1' },
  { value: '+44', label: '+44' },
  { value: '+65', label: '+65' },
  { value: '+971', label: '+971' },
]

const MAX_BYTES = 5 * 1024 * 1024

function readFile(file, kinds) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_BYTES) {
      reject(new Error('Max. size is 5 MB'))
      return
    }
    const mime = String(file.type || '').toLowerCase()
    const ok = kinds === 'image'
      ? mime.startsWith('image/')
      : mime.startsWith('image/') || mime === 'application/pdf' || mime.includes('word')
    if (!ok) {
      reject(new Error(kinds === 'image' ? 'Use JPG, PNG, GIF, or JPEG' : 'Use PDF, Word, or an image'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      resolve({
        name: file.name,
        mime: file.type,
        size: file.size,
        data: reader.result,
      })
    }
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

function FileSlot({ value, onChange, kinds, hint }) {
  const label = kinds === 'image' ? 'Photo' : 'Offer letter'
  return (
    <div className="ob-file">
      <Upload
        maxCount={1}
        showUploadList={false}
        beforeUpload={async (file) => {
          const next = await readFile(file, kinds)
          onChange(next)
          return false
        }}
      >
        <button type="button" className="ob-file-btn">
          <UploadOutlined />
          <span>Desktop</span>
        </button>
      </Upload>
      <span className="ob-file-or">or</span>
      <Upload
        maxCount={1}
        showUploadList={false}
        beforeUpload={async (file) => {
          const next = await readFile(file, kinds)
          onChange(next)
          return false
        }}
      >
        <button type="button" className="ob-file-btn">Cloud Drive</button>
      </Upload>
      {value?.name ? (
        <div className="ob-file-name">
          <Typography.Text ellipsis>{value.name}</Typography.Text>
          <Button type="link" size="small" onClick={() => onChange(null)}>Remove</Button>
        </div>
      ) : (
        <p className="ob-file-hint">{hint || `${label} · Max. size is 5 MB`}</p>
      )}
    </div>
  )
}

function AddressFields({ prefix, disabled }) {
  return (
    <div className={`ob-address-fields${disabled ? ' is-off' : ''}`}>
      <Form.Item name={[prefix, 'line1']}>
        <Input placeholder="Address line 1" disabled={disabled} />
      </Form.Item>
      <Form.Item name={[prefix, 'line2']}>
        <Input placeholder="Address line 2" disabled={disabled} />
      </Form.Item>
      <Form.Item name={[prefix, 'city']}>
        <Input placeholder="City" disabled={disabled} />
      </Form.Item>
      <div className="ob-address-split">
        <Form.Item name={[prefix, 'country']}>
          <Select
            placeholder="Select Country"
            disabled={disabled}
            options={COUNTRIES.map((c) => ({ value: c, label: c }))}
            showSearch
          />
        </Form.Item>
        <Form.Item name={[prefix, 'state']}>
          <Select
            placeholder="Select State"
            disabled={disabled}
            options={INDIA_STATES.map((c) => ({ value: c, label: c }))}
            showSearch
          />
        </Form.Item>
      </div>
      <Form.Item name={[prefix, 'postalCode']}>
        <Input placeholder="Postal Code" disabled={disabled} />
      </Form.Item>
    </div>
  )
}

export const emptyCandidate = {
  firstName: '',
  lastName: '',
  email: '',
  officialEmail: '',
  phone: '',
  countryCode: '+91',
  uan: '',
  aadhaar: '',
  pan: '',
  photo: null,
  presentAddress: { line1: '', line2: '', city: '', country: 'India', state: '', postalCode: '' },
  permanentAddress: { line1: '', line2: '', city: '', country: 'India', state: '', postalCode: '' },
  sameAsPresent: false,
  experienceYears: '',
  sourceOfHire: undefined,
  skillSet: '',
  highestQualification: '',
  additionalInfo: '',
  workLocation: undefined,
  title: undefined,
  currentSalary: '',
  department: undefined,
  offerLetter: null,
  tentativeJoiningDate: null,
  education: [{ schoolName: '', degree: '', fieldOfStudy: '', dateOfCompletion: '', additionalNotes: '' }],
  experience: [{ occupation: '', company: '', summary: '', duration: '', currentlyWorkHere: undefined }],
}

export function valuesFromCandidate(row) {
  if (!row) return emptyCandidate
  return {
    ...emptyCandidate,
    ...row,
    countryCode: row.countryCode || '+91',
    photo: row.photo?.data || row.photo?.name ? row.photo : null,
    offerLetter: row.offerLetter?.data || row.offerLetter?.name ? row.offerLetter : null,
    presentAddress: { ...emptyCandidate.presentAddress, ...(row.presentAddress || {}) },
    permanentAddress: { ...emptyCandidate.permanentAddress, ...(row.permanentAddress || {}) },
    tentativeJoiningDate: row.tentativeJoiningDate ? dayjs(row.tentativeJoiningDate) : null,
    education: row.education?.length ? row.education : emptyCandidate.education,
    experience: row.experience?.length ? row.experience : emptyCandidate.experience,
  }
}

export function payloadFromValues(values, { draft }) {
  const joining = values.tentativeJoiningDate
  return {
    draft: Boolean(draft),
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
    officialEmail: values.officialEmail,
    phone: values.phone,
    countryCode: values.countryCode,
    uan: values.uan,
    aadhaar: values.aadhaar,
    pan: values.pan,
    photo: values.photo?.data ? values.photo : undefined,
    presentAddress: values.presentAddress,
    permanentAddress: values.permanentAddress,
    sameAsPresent: Boolean(values.sameAsPresent),
    experienceYears: values.experienceYears,
    sourceOfHire: values.sourceOfHire,
    skillSet: values.skillSet,
    highestQualification: values.highestQualification,
    additionalInfo: values.additionalInfo,
    workLocation: values.workLocation,
    title: values.title,
    currentSalary: values.currentSalary,
    department: values.department,
    offerLetter: values.offerLetter?.data ? values.offerLetter : undefined,
    tentativeJoiningDate: joining ? (joining.toISOString ? joining.toISOString() : joining) : null,
    education: values.education,
    experience: values.experience,
  }
}

export default function PulseCandidateForm({ form }) {
  const sameAsPresent = Form.useWatch('sameAsPresent', form)
  const presentAddress = Form.useWatch('presentAddress', form)
  const departments = useMemo(() => DEPARTMENTS.map((d) => ({ value: d, label: d })), [])

  useEffect(() => {
    if (sameAsPresent && presentAddress) {
      form.setFieldValue('permanentAddress', presentAddress)
    }
  }, [sameAsPresent, presentAddress, form])

  return (
    <Form
      form={form}
      layout="vertical"
      className="ob-form"
      requiredMark
      initialValues={emptyCandidate}
    >
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Form.Item
            name="email"
            label="Email ID"
            rules={[{ type: 'email', message: 'Enter a valid email' }, { required: true, message: 'Email is required' }]}
          >
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item label="Phone" required>
            <Space.Compact className="ob-phone">
              <Form.Item name="countryCode" noStyle>
                <Select options={COUNTRY_CODES} style={{ width: 88 }} />
              </Form.Item>
              <Form.Item
                name="phone"
                noStyle
                rules={[{ required: true, message: 'Phone is required' }]}
              >
                <Input inputMode="tel" autoComplete="tel" />
              </Form.Item>
            </Space.Compact>
          </Form.Item>
          <Form.Item name="uan" label="UAN number">
            <Input />
          </Form.Item>
          <Form.Item name="aadhaar" label="Aadhaar card number">
            <Input />
          </Form.Item>
          <Form.Item name="pan" label="PAN card number">
            <Input placeholder="ABCDE1234F" />
          </Form.Item>
          <Form.Item name="photo" label="Photo">
            <FileSlot
              kinds="image"
              hint="Files supported: JPG, PNG, GIF, JPEG · Max. size is 5 MB"
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="firstName" label="First name" rules={[{ required: true, message: 'First name is required' }]}>
            <Input autoComplete="given-name" />
          </Form.Item>
          <Form.Item name="lastName" label="Last name" rules={[{ required: true, message: 'Last name is required' }]}>
            <Input autoComplete="family-name" />
          </Form.Item>
          <Form.Item name="officialEmail" label="Official Email" rules={[{ type: 'email', message: 'Enter a valid email' }]}>
            <Input autoComplete="off" />
          </Form.Item>
        </Col>
      </Row>

      <section className="ob-section">
        <Typography.Title level={5}>Address Details</Typography.Title>
        <div className="ob-address-block">
          <div className="ob-address-label">Present address</div>
          <AddressFields prefix="presentAddress" />
        </div>
        <div className="ob-address-block">
          <div className="ob-address-label">Permanent address</div>
          <div>
            <Form.Item name="sameAsPresent" valuePropName="checked" className="ob-same">
              <Checkbox>Same as Present address</Checkbox>
            </Form.Item>
            <AddressFields prefix="permanentAddress" disabled={Boolean(sameAsPresent)} />
          </div>
        </div>
      </section>

      <section className="ob-section">
        <Typography.Title level={5}>Professional Details</Typography.Title>
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Form.Item name="experienceYears" label="Experience">
              <Input placeholder="e.g. 4 years" />
            </Form.Item>
            <Form.Item name="sourceOfHire" label="Source of Hire">
              <Select placeholder="Select" allowClear options={HIRE_SOURCES.map((s) => ({ value: s, label: s }))} />
            </Form.Item>
            <Form.Item name="skillSet" label="Skill Set">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="highestQualification" label="Highest Qualification">
              <Input />
            </Form.Item>
            <Form.Item name="additionalInfo" label="Additional information">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="workLocation" label="Location">
              <Select placeholder="Select" allowClear options={LOCATIONS.map((s) => ({ value: s, label: s }))} />
            </Form.Item>
            <Form.Item name="title" label="Title">
              <Select placeholder="Select" allowClear options={TITLES.map((s) => ({ value: s, label: s }))} />
            </Form.Item>
            <Form.Item name="currentSalary" label="Current Salary">
              <Input />
            </Form.Item>
            <Form.Item name="department" label="Department">
              <Select placeholder="Select" allowClear options={departments} />
            </Form.Item>
            <Form.Item name="offerLetter" label="Offer Letter">
              <FileSlot kinds="doc" hint="Max. size is 5 MB" />
            </Form.Item>
            <Form.Item name="tentativeJoiningDate" label="Tentative Joining Date">
              <DatePicker format="DD-MMM-YYYY" style={{ width: '100%' }} placeholder="dd-MMM-yyyy" />
            </Form.Item>
          </Col>
        </Row>
      </section>

      <section className="ob-section">
        <Form.List name="education">
          {(fields, { add, remove }) => (
            <>
              <div className="ob-section-head">
                <Typography.Title level={5}>Education</Typography.Title>
                <Button type="link" icon={<PlusOutlined />} onClick={() => add()}>
                  Add Row
                </Button>
              </div>
              <div className="ob-grid-table">
                <div className="ob-grid-head">
                  <span>School Name</span>
                  <span>Degree/Diploma</span>
                  <span>Field(s) of Study</span>
                  <span>Date of Completion</span>
                  <span>Additional Notes</span>
                  <span />
                </div>
                {fields.map((field) => (
                  <div className="ob-grid-row" key={field.key}>
                    <Form.Item name={[field.name, 'schoolName']}><Input /></Form.Item>
                    <Form.Item name={[field.name, 'degree']}><Input /></Form.Item>
                    <Form.Item name={[field.name, 'fieldOfStudy']}><Input /></Form.Item>
                    <Form.Item name={[field.name, 'dateOfCompletion']}><Input placeholder="MMM yyyy" /></Form.Item>
                    <Form.Item name={[field.name, 'additionalNotes']}><Input.TextArea rows={1} /></Form.Item>
                    <Button type="text" danger icon={<DeleteOutlined />} aria-label="Remove education row" onClick={() => remove(field.name)} />
                  </div>
                ))}
              </div>
            </>
          )}
        </Form.List>
      </section>

      <section className="ob-section">
        <Form.List name="experience">
          {(fields, { add, remove }) => (
            <>
              <div className="ob-section-head">
                <Typography.Title level={5}>Experience</Typography.Title>
                <Button type="link" icon={<PlusOutlined />} onClick={() => add()}>
                  Add Row
                </Button>
              </div>
              <div className="ob-grid-table ob-grid-exp">
                <div className="ob-grid-head">
                  <span>Occupation</span>
                  <span>Company</span>
                  <span>Summary</span>
                  <span>Duration</span>
                  <span>Currently Work Here</span>
                  <span />
                </div>
                {fields.map((field) => (
                  <div className="ob-grid-row" key={field.key}>
                    <Form.Item name={[field.name, 'occupation']}><Input /></Form.Item>
                    <Form.Item name={[field.name, 'company']}><Input /></Form.Item>
                    <Form.Item name={[field.name, 'summary']}><Input.TextArea rows={1} /></Form.Item>
                    <Form.Item name={[field.name, 'duration']}><Input placeholder="e.g. 2 years" /></Form.Item>
                    <Form.Item name={[field.name, 'currentlyWorkHere']}>
                      <Select placeholder="Select" allowClear options={[{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]} />
                    </Form.Item>
                    <Button type="text" danger icon={<DeleteOutlined />} aria-label="Remove experience row" onClick={() => remove(field.name)} />
                  </div>
                ))}
              </div>
            </>
          )}
        </Form.List>
      </section>
    </Form>
  )
}
