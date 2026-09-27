import { useNavigate, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { useInvoice, useBankDetails, useUpdateInvoiceStatus } from '../../lib/invoiceQueries'
import type { Invoice, BankDetails, InvoiceStatus } from '../../lib/invoiceTypes'

const LABEL: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.62rem',
  fontWeight: 400,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--ink-muted)',
}

function statusPill(status: InvoiceStatus): React.CSSProperties {
  switch (status) {
    case 'draft':     return { background: 'rgba(44,42,37,0.06)',    color: 'var(--ink-muted)' }
    case 'sent':      return { background: 'rgba(74,107,138,0.1)',   color: '#4a6b8a' }
    case 'paid':      return { background: 'rgba(107,124,92,0.1)',   color: 'var(--olive)' }
    case 'overdue':   return { background: 'rgba(184,124,90,0.12)',  color: 'var(--clay)' }
    case 'cancelled': return { background: 'rgba(44,42,37,0.04)',    color: 'rgba(44,42,37,0.35)' }
  }
}

function generatePDFHtml(invoice: Invoice, bank: BankDetails): string {
  const isSamsara = invoice.business === 'samsara'
  const primary   = isSamsara ? '#c2a66d' : '#1a3d2b'
  const accent    = isSamsara ? '#6b7f5e' : '#b87333'
  const bg        = isSamsara ? '#faf4eb' : '#faf8f4'
  const businessName = isSamsara ? 'Samsara' : 'Engineered By Nature'
  const tagline      = isSamsara ? 'Handcrafted with intention' : 'engineered · grown · crafted'

  const items = invoice.items ?? []
  const subtotal = items.reduce((s, item) => s + item.line_total, 0)
  const total    = subtotal + (invoice.delivery_fee ?? 0)

  const itemRows = items.map(item => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid rgba(0,0,0,0.06);font-size:14px;font-weight:300;">${item.description}</td>
      <td style="padding:10px 0;text-align:right;border-bottom:1px solid rgba(0,0,0,0.06);font-size:14px;font-weight:300;">${item.quantity}</td>
      <td style="padding:10px 0;text-align:right;border-bottom:1px solid rgba(0,0,0,0.06);font-size:14px;font-weight:300;">R ${item.unit_price.toFixed(2)}</td>
      <td style="padding:10px 0;text-align:right;border-bottom:1px solid rgba(0,0,0,0.06);font-size:14px;font-weight:300;">R ${item.line_total.toFixed(2)}</td>
    </tr>
  `).join('')

  const deliveryRow = invoice.delivery_fee > 0 ? `
    <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;font-weight:300;color:#666;">
      <span>Subtotal</span><span>R ${subtotal.toFixed(2)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;font-weight:300;color:#666;">
      <span>Delivery</span><span>R ${invoice.delivery_fee.toFixed(2)}</span>
    </div>
  ` : ''

  const notesSection = invoice.notes ? `
    <div style="margin-top:32px;padding:16px 20px;background:rgba(0,0,0,0.02);border-radius:8px;">
      <div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${accent};margin-bottom:8px;">Notes</div>
      <p style="font-size:14px;font-weight:300;color:#555;line-height:1.6;">${invoice.notes}</p>
    </div>
  ` : ''

  const clientExtra = [
    invoice.client?.email ? `<div style="font-size:13px;font-weight:300;color:#666;">${invoice.client.email}</div>` : '',
    invoice.client?.phone ? `<div style="font-size:13px;font-weight:300;color:#666;">${invoice.client.phone}</div>` : '',
    invoice.client?.address ? `<div style="font-size:13px;font-weight:300;color:#666;">${invoice.client.address}</div>` : '',
  ].join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoice_number}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Cormorant Garamond',Georgia,serif;font-size:15px;line-height:1.6;color:#1a1a1a;background:${bg};padding:60px;}
    table{width:100%;border-collapse:collapse;}
    th{font-size:10px;font-weight:400;letter-spacing:0.18em;text-transform:uppercase;color:${accent};padding:0 0 10px;text-align:left;}
    th:not(:first-child){text-align:right;}
    @media print{body{padding:40px;background:white;}}
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px;padding-bottom:28px;border-bottom:2px solid ${primary};">
    <div>
      <div style="font-size:2rem;font-weight:300;color:${primary};letter-spacing:0.08em;">${businessName}</div>
      <div style="font-size:10px;font-weight:400;letter-spacing:0.22em;text-transform:uppercase;color:${accent};margin-top:4px;">${tagline}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:1.3rem;font-weight:300;color:${primary};letter-spacing:0.04em;">${invoice.invoice_number}</div>
      <div style="font-size:11px;color:#888;margin-top:6px;letter-spacing:0.06em;">Issue date &nbsp;${format(parseISO(invoice.issue_date), 'MMMM d, yyyy')}</div>
      <div style="font-size:11px;color:#888;letter-spacing:0.06em;">Due date &nbsp;&nbsp;&nbsp;${format(parseISO(invoice.due_date), 'MMMM d, yyyy')}</div>
    </div>
  </div>

  <!-- Client -->
  <div style="margin-bottom:36px;">
    <div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${accent};margin-bottom:8px;">Billed to</div>
    <div style="font-size:1.15rem;font-weight:300;color:#1a1a1a;">${invoice.client?.name ?? '—'}</div>
    ${clientExtra}
  </div>

  <!-- Items table -->
  <table style="margin-bottom:28px;">
    <thead>
      <tr style="border-bottom:1px solid ${primary};">
        <th>Description</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Unit Price</th><th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <!-- Totals -->
  <div style="margin-left:auto;width:280px;">
    ${deliveryRow}
    <div style="display:flex;justify-content:space-between;padding:12px 0 6px;border-top:1px solid ${primary};margin-top:4px;">
      <span style="font-size:13px;font-weight:400;letter-spacing:0.08em;text-transform:uppercase;color:${primary};">Total Due</span>
      <span style="font-size:1.4rem;font-weight:300;color:${primary};">R ${total.toFixed(2)}</span>
    </div>
  </div>

  ${notesSection}

  <!-- Bank details -->
  <div style="margin-top:40px;background:rgba(0,0,0,0.02);border:1px solid rgba(0,0,0,0.07);border-left:3px solid ${primary};padding:20px 24px;border-radius:0 8px 8px 0;">
    <div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${accent};margin-bottom:14px;">Banking details</div>
    ${[
      ['Account name', bank.account_name],
      ['Bank',         bank.bank_name],
      ['Account No.',  bank.account_number],
      ['Branch code',  bank.branch_code],
      ['Reference',    invoice.invoice_number],
    ].map(([l, v]) => `
      <div style="display:flex;gap:16px;margin-top:6px;">
        <span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${accent};min-width:110px;">${l}</span>
        <span style="font-size:14px;font-weight:300;color:#1a1a1a;">${v}</span>
      </div>
    `).join('')}
  </div>

  <!-- POP notice -->
  <div style="margin-top:28px;text-align:center;font-size:13px;font-style:italic;color:${accent};letter-spacing:0.02em;">
    Please send proof of payment to +27 82 824 4145
  </div>
</body>
</html>`
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: invoice, isLoading } = useInvoice(id!)
  const { data: bankDetails, isLoading: bankLoading, refetch: reloadBank } = useBankDetails(invoice?.business ?? 'samsara')
  const updateStatus = useUpdateInvoiceStatus()

  if (isLoading || bankLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 32px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, color: 'var(--ink-muted)', fontStyle: 'italic' }}>
          Loading…
        </p>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 32px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, color: 'var(--ink-muted)' }}>
          Invoice not found.
        </p>
        <button
          onClick={() => navigate('/invoices')}
          style={{ marginTop: '16px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--olive)', fontFamily: 'var(--font-body)', fontSize: '0.82rem' }}
        >
          ← Back to invoices
        </button>
      </div>
    )
  }

  // Do not print an invoice with invented or stale banking information on query failure.
  if (!bankDetails) return <div style={{ textAlign: 'center', padding: '80px 32px' }}>
    <p role="alert">Bank details could not be loaded. Please retry before downloading this invoice.</p>
    <button onClick={() => reloadBank()}>Retry</button>
    <button onClick={() => navigate('/invoices')}>Back to invoices</button>
  </div>
  const bank = bankDetails
  const items = invoice.items ?? []
  const subtotal = items.reduce((s, item) => s + item.line_total, 0)
  const total = subtotal + (invoice.delivery_fee ?? 0)

  const isSamsara = invoice.business === 'samsara'
  const brandColor = isSamsara ? '#c2a66d' : '#1a3d2b'
  const accentColor = isSamsara ? '#6b7f5e' : '#b87333'

  function handleDownloadPDF() {
    const html = generatePDFHtml(invoice!, bank)
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
    }
  }

  async function handleStatusUpdate(status: InvoiceStatus) {
    await updateStatus.mutateAsync({ id: invoice!.id, status })
  }

  return (
    <div className="animate-in" style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 40px 80px' }}>

      {/* Back link */}
      <button
        onClick={() => navigate('/invoices')}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          fontSize: '0.68rem',
          fontWeight: 400,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '32px',
          padding: 0,
          transition: 'color 150ms',
        }}
      >
        ← Invoices
      </button>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '4px' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 300,
              fontSize: '1.7rem',
              color: 'var(--ink)',
              letterSpacing: '0.04em',
            }}>
              {invoice.invoice_number}
            </h2>
            <span style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.62rem',
              fontWeight: 400,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              ...statusPill(invoice.status),
            }}>
              {invoice.status}
            </span>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 300, color: 'var(--ink-muted)' }}>
            {invoice.client?.name ?? '—'} · {format(parseISO(invoice.issue_date), 'MMMM d, yyyy')}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {invoice.status === 'draft' && (
            <button
              onClick={() => handleStatusUpdate('sent')}
              disabled={updateStatus.isPending}
              style={{
                background: 'transparent',
                border: '1px solid #4a6b8a',
                borderRadius: 'var(--radius-full)',
                padding: '9px 20px',
                fontFamily: 'var(--font-body)',
                fontSize: '0.66rem',
                fontWeight: 400,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#4a6b8a',
                cursor: 'pointer',
                transition: 'all 200ms',
                opacity: updateStatus.isPending ? 0.6 : 1,
              }}
            >
              Mark as Sent
            </button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <button
              onClick={() => handleStatusUpdate('paid')}
              disabled={updateStatus.isPending}
              style={{
                background: 'transparent',
                border: '1px solid var(--olive)',
                borderRadius: 'var(--radius-full)',
                padding: '9px 20px',
                fontFamily: 'var(--font-body)',
                fontSize: '0.66rem',
                fontWeight: 400,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--olive)',
                cursor: 'pointer',
                transition: 'all 200ms',
                opacity: updateStatus.isPending ? 0.6 : 1,
              }}
            >
              Mark as Paid
            </button>
          )}
          <button
            onClick={handleDownloadPDF}
            style={{
              background: 'var(--olive)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '9px 20px',
              fontFamily: 'var(--font-body)',
              fontSize: '0.66rem',
              fontWeight: 400,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(255,252,245,0.9)',
              cursor: 'pointer',
              transition: 'all 200ms',
            }}
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* Invoice preview */}
      <div className="card" style={{ padding: '44px 52px', marginBottom: '20px' }}>

        {/* Brand header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', paddingBottom: '28px', borderBottom: `1px solid ${brandColor}` }}>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 300, color: brandColor, letterSpacing: '0.08em' }}>
              {isSamsara ? 'Samsara' : 'Engineered By Nature'}
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.58rem', fontWeight: 400, letterSpacing: '0.2em', textTransform: 'uppercase', color: accentColor, marginTop: '5px' }}>
              {isSamsara ? 'Handcrafted with intention' : 'engineered · grown · crafted'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 300, color: 'var(--ink)', letterSpacing: '0.04em' }}>
              {invoice.invoice_number}
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 300, color: 'var(--ink-muted)', marginTop: '6px' }}>
              Issued &nbsp;{format(parseISO(invoice.issue_date), 'MMMM d, yyyy')}
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 300, color: 'var(--ink-muted)' }}>
              Due &nbsp;&nbsp;&nbsp;&nbsp;{format(parseISO(invoice.due_date), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Client */}
        <div style={{ marginBottom: '32px' }}>
          <p style={{ ...LABEL, color: accentColor, marginBottom: '8px' }}>Billed to</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 300, color: 'var(--ink)' }}>
            {invoice.client?.name ?? '—'}
          </p>
          {invoice.client?.email && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 300, color: 'var(--ink-muted)' }}>
              {invoice.client.email}
            </p>
          )}
          {invoice.client?.phone && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 300, color: 'var(--ink-muted)' }}>
              {invoice.client.phone}
            </p>
          )}
          {invoice.client?.address && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 300, color: 'var(--ink-muted)' }}>
              {invoice.client.address}
            </p>
          )}
        </div>

        {/* Line items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${brandColor}` }}>
              {['Description', 'Qty', 'Unit Price', 'Total'].map((h, i) => (
                <th
                  key={h}
                  style={{
                    ...LABEL,
                    color: accentColor,
                    textAlign: i === 0 ? 'left' : 'right',
                    paddingBottom: '12px',
                    paddingRight: i < 3 ? '16px' : 0,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i, arr) => (
              <tr key={item.id} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td style={{ padding: '12px 16px 12px 0', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 300, color: 'var(--ink)' }}>
                  {item.description}
                </td>
                <td style={{ padding: '12px 16px 12px 0', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 300, color: 'var(--ink-muted)', textAlign: 'right' }}>
                  {item.quantity}
                </td>
                <td style={{ padding: '12px 16px 12px 0', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 300, color: 'var(--ink-muted)', textAlign: 'right' }}>
                  R {item.unit_price.toFixed(2)}
                </td>
                <td style={{ padding: '12px 0', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 300, color: 'var(--ink)', textAlign: 'right' }}>
                  R {item.line_total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ marginLeft: 'auto', width: '260px' }}>
          {invoice.delivery_fee > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 300, color: 'var(--ink-muted)' }}>Subtotal</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 300, color: 'var(--ink)' }}>R {subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 300, color: 'var(--ink-muted)' }}>Delivery</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 300, color: 'var(--ink)' }}>R {invoice.delivery_fee.toFixed(2)}</span>
              </div>
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: `1px solid ${brandColor}`, marginTop: '4px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 400, color: brandColor, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total Due</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 300, color: brandColor }}>R {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            <p style={{ ...LABEL, color: accentColor, marginBottom: '8px' }}>Notes</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 300, color: 'var(--ink-muted)', lineHeight: 1.7 }}>
              {invoice.notes}
            </p>
          </div>
        )}
      </div>

      {/* Bank details */}
      <div className="card" style={{ padding: '28px 32px', marginBottom: '16px' }}>
        <p style={{ ...LABEL, color: accentColor, marginBottom: '16px' }}>Banking details</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 32px' }}>
          {[
            ['Account name',   bank.account_name],
            ['Bank',           bank.bank_name],
            ['Account number', bank.account_number],
            ['Branch code',    bank.branch_code],
            ['Reference',      invoice.invoice_number],
          ].map(([label, value]) => (
            <div key={label}>
              <p style={{ ...LABEL, marginBottom: '2px' }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 300, color: 'var(--ink)' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* POP notice */}
      <div style={{ textAlign: 'center', padding: '12px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 300, color: 'var(--ink-muted)', fontStyle: 'italic' }}>
          Please send proof of payment to +27 82 824 4145
        </p>
      </div>
    </div>
  )
}
