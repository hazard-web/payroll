import PageShell, { PageHeader } from '../../components/PageShell'

export default function PortalAnnouncements() {
  return (
    <PageShell narrow>
      <PageHeader
        title="Announcements"
        subtitle="Latest company updates and notices"
      />
      <div style={{ display: 'grid', gap: 18, marginTop: 18 }}>
        <div style={{ padding: 20, borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Announcement content will appear here once published by your HR or admin team.
          </p>
        </div>
      </div>
    </PageShell>
  )
}
