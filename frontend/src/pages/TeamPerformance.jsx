import PageShell, { PageHeader, SectionCard } from '../components/PageShell'

export default function TeamPerformance() {
  return (
    <PageShell>
      <PageHeader
        title="Team Performance"
        subtitle="Monitor your team's attendance, productivity trends, and key performance signals."
      />

      <SectionCard title="Coming soon" noPadding>
        <div className="section-card__body">
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
            This section will provide a streamlined view of team KPIs, attendance insights, and performance indicators to help payroll and HR teams take action faster.
          </p>
        </div>
      </SectionCard>
    </PageShell>
  )
}
