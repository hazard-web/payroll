import PageShell, { PageHeader } from '../../components/PageShell'

export default function PortalHelp() {
  return (
    <PageShell narrow>
      <PageHeader
        title="Help & Support"
        subtitle="Get help with attendance, payslips, and portal access"
      />
      <div style={{ display: 'grid', gap: 18, marginTop: 18 }}>
        <div style={{ padding: 20, borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            For immediate assistance, click the floating support button in the portal or contact your HR team.
          </p>
        </div>
      </div>
    </PageShell>
  )
}
