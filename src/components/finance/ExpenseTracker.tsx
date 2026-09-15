import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import {
  useCreateOpsExpense,
  useCreateOpsExpenseCategory,
  useDeleteOpsExpense,
  useDeleteOpsExpenseCategory,
  useFinEntries,
  useOpsExpenseCategories,
  useOpsExpenses,
} from '../../lib/queries'

const FALLBACK_CATEGORIES = [
  { id: 'food', name: 'FOOD', color: '#8a6a3a', is_builtin: true },
  { id: 'business', name: 'BUSINESS', color: '#6b5c8a', is_builtin: true },
  { id: 'running', name: 'RUNNING COSTS', color: '#5c7a5c', is_builtin: true },
  { id: 'lifestyle', name: 'LIFESTYLE', color: '#8a4a4a', is_builtin: true },
]
const CUSTOM_COLORS = ['#3f7287', '#9a6b55', '#65704d', '#896f91', '#a38345', '#4f7d73']

const LABEL: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: '0.62rem', fontWeight: 400,
  letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-muted)',
}
const FIELD_STYLE: React.CSSProperties = {
  width: '100%', background: 'transparent', border: 'none',
  borderBottom: '1px solid var(--border)', padding: '8px 0 10px',
  fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 300,
  color: 'var(--ink)', outline: 'none',
}
const PILL_BUTTON: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '0.7rem',
  letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: 'var(--radius-full)',
  padding: '9px 18px', cursor: 'pointer', transition: 'all 200ms ease',
}

export function ExpenseTracker() {
  const today = format(new Date(), 'yyyy-MM')
  const [selectedMonth, setSelectedMonth] = useState(today)
  const [showLog, setShowLog] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  // The account tab only filters the log; summaries intentionally use all expenses.
  const [logAccount, setLogAccount] = useState<'personal' | 'business'>('personal')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [formAmount, setFormAmount] = useState('')
  const [formCategory, setFormCategory] = useState('FOOD')
  const [formAccount, setFormAccount] = useState<'personal' | 'business'>('personal')
  const [formDescription, setFormDescription] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const { data: expenses = [], isLoading } = useOpsExpenses(selectedMonth)
  const { data: entries = [] } = useFinEntries()
  const { data: savedCategories } = useOpsExpenseCategories()
  const createExpense = useCreateOpsExpense()
  const deleteExpense = useDeleteOpsExpense()
  const createCategory = useCreateOpsExpenseCategory()
  const deleteCategory = useDeleteOpsExpenseCategory()

  // Keep the page usable while the category migration is being deployed.
  const categories = savedCategories?.length ? savedCategories : FALLBACK_CATEGORIES
  const colorFor = (name: string) => categories.find(c => c.name === name)?.color || '#77756f'
  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount), 0), [expenses])
  const income = useMemo(() => entries.filter(e => e.month === selectedMonth)
    .reduce((sum, e) => sum + Number(e.amount_zar), 0), [entries, selectedMonth])
  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>()
    expenses.forEach(e => totals.set(e.category, (totals.get(e.category) || 0) + Number(e.amount)))
    return [...totals].map(([category, amount]) => ({ category, amount, percentage: totalExpenses ? amount / totalExpenses * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount)
  }, [expenses, totalExpenses])
  const logExpenses = useMemo(
    () => expenses.filter(expense => (expense.account_type || 'personal') === logAccount),
    [expenses, logAccount],
  )

  async function handleAddExpense(event: React.FormEvent) {
    event.preventDefault()
    if (!formAmount || !formDescription.trim()) return
    setSubmitting(true); setErrorMessage('')
    try {
      await createExpense.mutateAsync({ amount: Number(formAmount), category: formCategory, account_type: formAccount, description: formDescription.trim(), date: formDate })
      setFormAmount(''); setFormDescription(''); setShowForm(false)
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Could not save expense.') }
    finally { setSubmitting(false) }
  }

  async function handleDeleteExpense(id: string, description: string) {
    if (!window.confirm(`Delete “${description}”? This cannot be undone.`)) return
    try { await deleteExpense.mutateAsync(id) }
    catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Could not delete expense.') }
  }

  async function handleAddCategory(event: React.FormEvent) {
    event.preventDefault()
    const name = newCategory.trim().toUpperCase()
    if (!name) return
    setErrorMessage('')
    try {
      const created = await createCategory.mutateAsync({ name, color: CUSTOM_COLORS[categories.length % CUSTOM_COLORS.length] })
      setFormCategory(created.name); setNewCategory('')
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Could not create category.') }
  }

  async function handleDeleteCategory(id: string, name: string) {
    if (expenses.some(e => e.category === name)) {
      setErrorMessage(`“${name}” is used by an expense in this month. Reassign or delete those expenses first.`)
      return
    }
    if (!window.confirm(`Remove the category “${name}”? Historical expenses in other months will keep their label.`)) return
    try {
      await deleteCategory.mutateAsync(id)
      if (formCategory === name) setFormCategory('FOOD')
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Could not remove category.') }
  }

  return (
    <div className="card" style={{ padding: '28px 32px', marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div><p style={{ ...LABEL, marginBottom: 4 }}>Expense Tracker</p><p style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>Spending by category</p></div>
        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ ...FIELD_STYLE, width: 'auto', minWidth: 140, fontSize: '0.78rem' }} />
      </div>

      {errorMessage && <div style={{ color: 'var(--clay)', fontSize: '0.78rem', marginBottom: 16 }}>{errorMessage}</div>}
      {isLoading ? <p style={{ textAlign: 'center', color: 'var(--ink-muted)', padding: 24 }}>Loading…</p> : expenses.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--ink-muted)', fontStyle: 'italic', padding: '28px 0' }}>No expenses logged this month.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 0.8fr) minmax(220px, 1.2fr)', gap: 28, alignItems: 'center', marginBottom: 22 }}>
          {/* Recharts provides an accessible, responsive donut without custom SVG geometry. */}
          <div style={{ height: 210, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryTotals} dataKey="amount" nameKey="category" innerRadius={53} outerRadius={84} paddingAngle={2}>
              {categoryTotals.map(item => {
                const selected = activeCategory === item.category
                const dimmed = activeCategory !== null && !selected
                return <Cell key={item.category} fill={colorFor(item.category)} opacity={dimmed ? 0.2 : 1} stroke={selected ? '#fffdf7' : 'transparent'} strokeWidth={selected ? 5 : 0} style={{ filter: selected ? `drop-shadow(0 0 6px ${colorFor(item.category)})` : undefined, transition: 'opacity 180ms ease' }} />
              })}
            </Pie><Tooltip formatter={(value: number) => `R ${Number(value).toLocaleString('en-ZA', { maximumFractionDigits: 2 })}`} /></PieChart></ResponsiveContainer>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
              <span style={LABEL}>Total</span><strong style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}>R {totalExpenses.toLocaleString('en-ZA')}</strong>
            </div>
          </div>
          <div>{categoryTotals.map(item => {
            const selected = activeCategory === item.category
            return <button type="button" key={item.category} onClick={() => setActiveCategory(selected ? null : item.category)} aria-pressed={selected} style={{ width: '100%', display: 'grid', gridTemplateColumns: '12px 1fr auto', gap: 9, alignItems: 'center', padding: '8px 10px', border: selected ? `1px solid ${colorFor(item.category)}` : '1px solid transparent', borderRadius: 8, background: selected ? `${colorFor(item.category)}18` : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 180ms ease' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: colorFor(item.category), boxShadow: selected ? `0 0 7px ${colorFor(item.category)}` : 'none' }} />
              <span style={{ fontSize: '0.76rem', color: 'var(--ink)' }}>{item.category}</span>
              <span style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>{item.percentage.toFixed(1)}% · R {item.amount.toLocaleString('en-ZA')}</span>
            </button>
          })}</div>
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setShowForm(v => !v)} style={{ ...PILL_BUTTON, color: '#fff', background: 'var(--ink)', border: 'none' }}>{showForm ? 'Close form' : '+ Add expense'}</button>
        <button type="button" onClick={() => setShowLog(v => !v)} style={{ ...PILL_BUTTON, color: 'var(--ink)', background: 'transparent', border: '1px solid var(--border)' }}>{showLog ? 'Hide expense log' : `Show expense log (${expenses.length})`}</button>
        <button type="button" onClick={() => setShowCategories(v => !v)} style={{ ...PILL_BUTTON, color: 'var(--ink)', background: 'transparent', border: '1px solid var(--border)' }}>{showCategories ? 'Close categories' : 'Manage categories'}</button>
      </div>

      {showForm && <form onSubmit={handleAddExpense} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 120px', ...LABEL }}>Date<input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={FIELD_STYLE} required /></label>
          <label style={{ flex: '1 1 120px', ...LABEL }}>Amount (R)<input type="number" min="0.01" step="0.01" value={formAmount} onChange={e => setFormAmount(e.target.value)} style={FIELD_STYLE} required /></label>
          <label style={{ flex: '1 1 150px', ...LABEL }}>Category<select value={formCategory} onChange={e => setFormCategory(e.target.value)} style={FIELD_STYLE}>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></label>
          <label style={{ flex: '1 1 140px', ...LABEL }}>Account<select value={formAccount} onChange={e => setFormAccount(e.target.value as 'personal' | 'business')} style={FIELD_STYLE}><option value="personal">Personal</option><option value="business">Business</option></select></label>
        </div>
        <label style={LABEL}>Description<input value={formDescription} onChange={e => setFormDescription(e.target.value)} style={FIELD_STYLE} required /></label>
        <button disabled={submitting} style={{ ...PILL_BUTTON, alignSelf: 'flex-start', color: '#fff', background: 'var(--ink)', border: 'none' }}>{submitting ? 'Saving…' : 'Save expense'}</button>
      </form>}

      {showCategories && <div style={{ marginTop: 20, padding: 18, background: 'rgba(44,42,37,0.035)', borderRadius: 'var(--radius-md)' }}>
        <p style={{ ...LABEL, marginBottom: 12 }}>Expense categories</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>{categories.map(c => <span key={c.id} style={{ border: '1px solid var(--border)', borderRadius: 20, padding: '6px 10px', fontSize: '0.72rem' }}><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 8, background: c.color, marginRight: 6 }} />{c.name}{!c.is_builtin && <button type="button" aria-label={`Remove ${c.name}`} onClick={() => handleDeleteCategory(c.id, c.name)} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--clay)', marginLeft: 7 }}>×</button>}</span>)}</div>
        <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 10, alignItems: 'end' }}><label style={{ ...LABEL, flex: 1 }}>New category<input maxLength={40} value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="e.g. TRAVEL" style={FIELD_STYLE} /></label><button style={{ ...PILL_BUTTON, color: '#fff', background: 'var(--ink)', border: 0 }}>Add</button></form>
      </div>}

      {showLog && expenses.length > 0 && <div style={{ marginTop: 22 }}>
        <div role="tablist" aria-label="Expense account" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {(['personal', 'business'] as const).map(account => {
            const count = expenses.filter(expense => (expense.account_type || 'personal') === account).length
            const selected = logAccount === account
            return <button type="button" role="tab" aria-selected={selected} key={account} onClick={() => setLogAccount(account)} style={{ ...PILL_BUTTON, color: selected ? '#fff' : 'var(--ink)', background: selected ? 'var(--ink)' : 'transparent', border: '1px solid var(--border)' }}>{account} ({count})</button>
          })}
        </div>
        <div style={{ overflowX: 'auto' }}>
          {logExpenses.length === 0 ? <p style={{ color: 'var(--ink-muted)', fontSize: '0.78rem', fontStyle: 'italic', padding: '14px 0' }}>No {logAccount} expenses this month.</p> : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}><thead><tr>{['Date', 'Category', 'Description', 'Amount', ''].map((h, i) => <th key={i} style={{ ...LABEL, textAlign: i === 3 ? 'right' : 'left', padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
            <tbody>{logExpenses.map(e => <tr key={e.id}><td style={cellStyle}>{format(new Date(`${e.date}T00:00:00`), 'dd MMM yyyy')}</td><td style={cellStyle}><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 8, background: colorFor(e.category), marginRight: 6 }} />{e.category}</td><td style={cellStyle}>{e.description}</td><td style={{ ...cellStyle, textAlign: 'right' }}>R {Number(e.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td><td style={cellStyle}><button type="button" onClick={() => handleDeleteExpense(e.id, e.description)} aria-label={`Delete ${e.description}`} style={{ border: 0, background: 'transparent', color: 'var(--clay)', cursor: 'pointer' }}>Delete</button></td></tr>)}</tbody>
          </table>}
        </div>
      </div>}
      {income > 0 && <p style={{ textAlign: 'center', color: 'var(--ink-muted)', fontSize: '0.72rem', marginTop: 18 }}>Expenses are {((totalExpenses / income) * 100).toFixed(0)}% of income.</p>}
    </div>
  )
}

const cellStyle: React.CSSProperties = { padding: '9px 10px', fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 300, borderBottom: '1px solid var(--border)' }
