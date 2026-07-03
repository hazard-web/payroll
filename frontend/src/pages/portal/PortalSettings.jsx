import PageShell, { PageHeader } from '../../components/PageShell'

export default function PortalSettings() {
  return (
    <PageShell narrow>
      <PageHeader
        title="Settings"
        subtitle="Update your portal preferences"
      />
      <div style={{ display: 'grid', gap: 18, marginTop: 18 }}>
        <div style={{ padding: 20, borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Settings for your portal experience will be available here soon.
          </p>
        </div>
      </div>
    </PageShell>
  )
}
