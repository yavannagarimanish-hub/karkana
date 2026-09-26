import Link from 'next/link';
import { requireAdminPage } from '@/infra/auth/guards';
import { getAppServices } from '@/infra/db';
import type { ValidationSeverity } from '@/core/services/validation';
import { Badge } from '@/ui/badge';
import { Card, CardHeader } from '@/ui/card';
import { Table, TD, TH, THead, TR } from '@/ui/table';

const SEVERITY_TONE: Record<ValidationSeverity, 'danger' | 'warn' | 'neutral'> = {
  ERROR: 'danger',
  WARNING: 'warn',
  INCOMPLETE: 'neutral',
};

export default async function AdminValidationPage() {
  await requireAdminPage();
  const services = await getAppServices();
  const report = await services.admin.validation();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[0.02em] uppercase sm:text-3xl">
            Catalogue validation
          </h1>
          <p className="numeric mt-2 text-sm text-fg-muted">
            {report.totalProducts} products checked · generated{' '}
            {new Date(report.generatedAt).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="danger">{report.bySeverity.ERROR} errors</Badge>
          <Badge tone="warn">{report.bySeverity.WARNING} warnings</Badge>
          <Badge tone="neutral">{report.bySeverity.INCOMPLETE} optional</Badge>
        </div>
      </header>

      <Card>
        <CardHeader
          title="Completeness"
          subtitle={`${Math.round(report.completeness * 100)}% of products have no errors and no warnings`}
        />
        <ul className="divide-y divide-hairline">
          {report.coverage.map((row) => (
            <li key={row.field} className="flex items-center gap-4 px-5 py-3">
              <span className="w-44 shrink-0 text-sm text-fg-muted">{row.label}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-raised">
                <span
                  className={`block h-full ${
                    row.percent >= 90 ? 'bg-status-ok' : row.percent >= 50 ? 'bg-status-warn' : 'bg-status-danger'
                  }`}
                  style={{ width: `${row.percent}%` }}
                />
              </span>
              <span className="numeric w-20 shrink-0 text-right text-xs text-fg-dim">
                {row.filled}/{row.total}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader
          title="Issues"
          subtitle={`${report.issueCount} findings across ${report.productsRequiringAttention.length} products`}
        />

        {report.issues.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-fg-muted">
            The catalogue is clean: no errors, warnings or optional gaps.
          </p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Severity</TH>
                <TH>Product</TH>
                <TH>Field</TH>
                <TH>Finding</TH>
              </TR>
            </THead>
            <tbody>
              {report.issues.slice(0, 400).map((issue) => (
                <TR key={`${issue.productId}-${issue.field}-${issue.severity}`}>
                  <TD>
                    <Badge tone={SEVERITY_TONE[issue.severity]}>{issue.severity}</Badge>
                  </TD>
                  <TD>
                    <Link
                      href={`/product/${issue.productId}`}
                      className="numeric text-sm font-semibold text-fg transition-colors hover:text-ember"
                    >
                      {issue.productId}
                    </Link>
                    <p className="mt-0.5 truncate text-[11px] text-fg-dim">{issue.productName}</p>
                  </TD>
                  <TD>
                    <span className="font-mono text-[11px] text-fg-muted">{issue.field}</span>
                  </TD>
                  <TD>
                    <span className="text-sm text-fg-muted">{issue.message}</span>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}

        {report.issues.length > 400 && (
          <p className="border-t border-hairline px-5 py-3 text-[11px] text-fg-dim">
            Showing the first 400 of {report.issues.length} findings.
          </p>
        )}
      </Card>
    </div>
  );
}
