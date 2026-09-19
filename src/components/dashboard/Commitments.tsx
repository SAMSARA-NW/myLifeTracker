import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

type Priority = 'low' | 'medium' | 'high'
type CommitmentStatus = 'scheduled' | 'done' | 'cancelled'

interface Commitment {
  id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  all_day: boolean
  priority: Priority
  location: string | null
  category: string | null
  status: CommitmentStatus
  remind_day_before: boolean
  remind_hour_before: boolean
  reminded_day_at: string | null
  reminded_hour_at: string | null
  created_at: string
  updated_at: string
}

// ── Queries ────────────────────────────────────────────────────────────────────

function useCommitments() {
  return useQuery({
    queryKey: ['calendar_commitments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_commitments')
        .select('*')
        .eq('status', 'scheduled')
        .order('starts_at', { ascending: true })
      if (error) throw error
      return data as Commitment[]
    },
  })
}

function useAddCommitment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (row: Partial<Commitment>) => {
      const { data, error } = await supabase
        .from('calendar_commitments')
        .insert(row)
        .select()
        .single()
      if (error) throw error
      return data as Commitment
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar_commitments'] }),
  })
}

function useUpdateCommitment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Commitment> & { id: string }) => {
      const { data, error } = await supabase
        .from('calendar_commitments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Commitment
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar_commitments'] }),
  })
}

function useDeleteCommitment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('calendar_commitments').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar_commitments'] }),
  })
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const LABEL: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.6rem',
  fontWeight: 400,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--ink-muted)',
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  high:   { label: 'High',   color: '#a05050', bg: 'rgba(160,80,80,0.1)' },
  medium: { label: 'Medium', color: '#8a7a4a', bg: 'rgba(138,122,74,0.1)' },
  low:    { label: 'Low',    color: 'var(--ink-muted)', bg: 'rgba(44,42,37,0.05)' },
}

// Which emails a commitment gets by default. High commitments are worth both
// nudges; medium gets the day before; low gets nothing.
const REMINDER_DEFAULTS: Record<Priority, { day: boolean; hour: boolean }> = {
  high:   { day: true, hour: true },
  medium: { day: true, hour: false },
  low:    { day: false, hour: false },
}

const inputStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.82rem',
  fontWeight: 300,
  color: 'var(--ink)',
  background: 'rgba(44,42,37,0.03)',
  border: '1px solid rgba(44,42,37,0.1)',
  borderRadius: '8px',
  padding: '8px 12px',
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
}

const textareaStyle: CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: '70px',
  lineHeight: 1.6,
}

// ── Row ────────────────────────────────────────────────────────────────────────

function CommitmentRow({ item, onSelect }: { item: Commitment; onSelect: (c: Commitment) => void }) {
  const cfg = PRIORITY_CONFIG[item.priority]
  const start = new Date(item.starts_at)
  const end = item.ends_at ? new Date(item.ends_at) : null
  const timeLabel = item.all_day
    ? 'All day'
    : `${format(start, 'HH:mm')}${end ? `–${format(end, 'HH:mm')}` : ''}`

  return (
    <div
      onClick={() => onSelect(item)}
      style={{
        padding: '12px 14px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid rgba(44,42,37,0.07)',
        background: item.priority === 'high' ? 'rgba(160,80,80,0.03)' : 'transparent',
        cursor: 'pointer',
        transition: 'all 200ms ease',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
      }}
    >
      <div style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: cfg.color, flexShrink: 0, marginTop: '6px',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 400,
          color: 'var(--ink)', margin: 0, lineHeight: 1.4,
        }}>
          {item.title}
        </p>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 300,
          color: 'var(--ink-muted)', margin: '2px 0 0',
        }}>
          {timeLabel}
          {item.location ? ` · ${item.location}` : ''}
        </p>
      </div>
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: '0.52rem', letterSpacing: '0.1em',
        textTransform: 'uppercase', color: cfg.color, background: cfg.bg,
        padding: '2px 8px', borderRadius: 'var(--radius-full)', flexShrink: 0,
        marginTop: '2px',
      }}>
        {cfg.label}
      </span>
    </div>
  )
}

// ── Detail / Edit Modal ────────────────────────────────────────────────────────

function CommitmentDetail({
  item,
  initialDate,
  onClose,
}: {
  item: Commitment | 'new'
  initialDate?: Date
  onClose: () => void
}) {
  const isNew = item === 'new'
  const addCommitment = useAddCommitment()
  const updateCommitment = useUpdateCommitment()
  const deleteCommitment = useDeleteCommitment()

  const [title, setTitle] = useState(isNew ? '' : item.title)
  const [description, setDescription] = useState(isNew ? '' : (item.description ?? ''))
  const [date, setDate] = useState(
    isNew
      ? format(initialDate ?? new Date(), 'yyyy-MM-dd')
      : format(new Date(item.starts_at), 'yyyy-MM-dd'),
  )
  const [time, setTime] = useState(isNew ? '09:00' : (item.all_day ? '09:00' : format(new Date(item.starts_at), 'HH:mm')))
  const [endTime, setEndTime] = useState(isNew || !item.ends_at ? '' : format(new Date(item.ends_at), 'HH:mm'))
  const [allDay, setAllDay] = useState(isNew ? false : item.all_day)
  const [priority, setPriority] = useState<Priority>(isNew ? 'medium' : item.priority)
  const [location, setLocation] = useState(isNew ? '' : (item.location ?? ''))
  const [category, setCategory] = useState(isNew ? '' : (item.category ?? ''))
  const [status, setStatus] = useState<CommitmentStatus>(isNew ? 'scheduled' : item.status)
  const [remindDay, setRemindDay] = useState(isNew ? REMINDER_DEFAULTS.medium.day : item.remind_day_before)
  const [remindHour, setRemindHour] = useState(isNew ? REMINDER_DEFAULTS.medium.hour : item.remind_hour_before)

  // Changing priority re-applies the default reminder pair, unless the user has
  // already overridden it by hand.
  const choosePriority = (p: Priority) => {
    setPriority(p)
    if (isNew) {
      setRemindDay(REMINDER_DEFAULTS[p].day)
      setRemindHour(REMINDER_DEFAULTS[p].hour)
    }
  }

  const buildStamp = (d: string, t: string) => new Date(`${d}T${t}:00`).toISOString()

  const save = async () => {
    const payload: Partial<Commitment> = {
      title,
      description: description || null,
      starts_at: buildStamp(date, allDay ? '00:00' : time),
      ends_at: !allDay && endTime ? buildStamp(date, endTime) : null,
      all_day: allDay,
      priority,
      location: location || null,
      category: category || null,
      status,
      remind_day_before: remindDay,
      remind_hour_before: remindHour,
    }
    if (isNew) {
      await addCommitment.mutateAsync(payload)
    } else {
      await updateCommitment.mutateAsync({ id: item.id, ...payload })
    }
    onClose()
  }

  const handleDelete = async () => {
    if (!isNew) await deleteCommitment.mutateAsync(item.id)
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(44,42,37,0.3)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(248,245,238,0.98)', backdropFilter: 'blur(16px)',
          borderRadius: 'var(--radius-lg)', border: '1px solid rgba(44,42,37,0.08)',
          boxShadow: '0 24px 80px rgba(44,42,37,0.12)',
          width: '100%', maxWidth: '540px', maxHeight: '85vh', overflowY: 'auto',
          padding: '32px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <p style={{ ...LABEL, margin: 0 }}>{isNew ? 'Add a commitment' : 'Edit commitment'}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--ink-muted)' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <p style={{ ...LABEL, marginBottom: '6px' }}>What</p>
            <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Call with Airwave" />
          </div>

          <div>
            <p style={{ ...LABEL, marginBottom: '8px' }}>Priority</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['low', 'medium', 'high'] as Priority[]).map(p => (
                <button
                  key={p}
                  onClick={() => choosePriority(p)}
                  style={{
                    fontFamily: 'var(--font-body)', fontSize: '0.7rem', letterSpacing: '0.08em',
                    textTransform: 'uppercase', padding: '5px 14px', borderRadius: 'var(--radius-full)',
                    cursor: 'pointer', transition: 'all 200ms ease',
                    border: `1px solid ${priority === p ? PRIORITY_CONFIG[p].color : 'rgba(44,42,37,0.12)'}`,
                    background: priority === p ? PRIORITY_CONFIG[p].bg : 'transparent',
                    color: priority === p ? PRIORITY_CONFIG[p].color : 'var(--ink-muted)',
                  }}
                >
                  {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <p style={{ ...LABEL, marginBottom: '6px' }}>Date</p>
              <input type="date" style={inputStyle} value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <p style={{ ...LABEL, marginBottom: '6px' }}>From</p>
              <input type="time" style={inputStyle} value={time} onChange={e => setTime(e.target.value)} disabled={allDay} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'end' }}>
            <div>
              <p style={{ ...LABEL, marginBottom: '6px' }}>Until (optional)</p>
              <input type="time" style={inputStyle} value={endTime} onChange={e => setEndTime(e.target.value)} disabled={allDay} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', paddingBottom: '9px' }}>
              <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} style={{ accentColor: '#5a7247' }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--ink-muted)' }}>All day</span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <p style={{ ...LABEL, marginBottom: '6px' }}>Where</p>
              <input style={inputStyle} value={location} onChange={e => setLocation(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <p style={{ ...LABEL, marginBottom: '6px' }}>Category</p>
              <input style={inputStyle} value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Client, Farm" />
            </div>
          </div>

          <div>
            <p style={{ ...LABEL, marginBottom: '6px' }}>Notes</p>
            <textarea style={textareaStyle} value={description} onChange={e => setDescription(e.target.value)} placeholder="Anything worth remembering" />
          </div>

          <div>
            <p style={{ ...LABEL, marginBottom: '8px' }}>Email reminders</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={remindDay} onChange={e => setRemindDay(e.target.checked)} style={{ accentColor: '#5a7247' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--ink)' }}>Day before</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={remindHour} onChange={e => setRemindHour(e.target.checked)} style={{ accentColor: '#5a7247' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--ink)' }}>1 hour before</span>
              </label>
            </div>
          </div>

          {!isNew && (
            <div>
              <p style={{ ...LABEL, marginBottom: '8px' }}>Status</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['scheduled', 'done', 'cancelled'] as CommitmentStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    style={{
                      fontFamily: 'var(--font-body)', fontSize: '0.68rem', letterSpacing: '0.08em',
                      textTransform: 'uppercase', padding: '5px 14px', borderRadius: 'var(--radius-full)',
                      cursor: 'pointer', transition: 'all 200ms ease',
                      border: `1px solid ${status === s ? 'rgba(90,114,71,0.5)' : 'rgba(44,42,37,0.12)'}`,
                      background: status === s ? 'rgba(90,114,71,0.1)' : 'transparent',
                      color: status === s ? '#5a7247' : 'var(--ink-muted)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
          <div>
            {!isNew && (
              <button onClick={handleDelete} style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: '#a05050', background: 'none', border: '1px solid rgba(160,80,80,0.3)', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer' }}>Remove</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--ink-muted)', background: 'none', border: '1px solid rgba(44,42,37,0.15)', borderRadius: '8px', padding: '7px 18px', cursor: 'pointer' }}>Cancel</button>
            <button
              onClick={save}
              disabled={!title.trim()}
              style={{
                fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'white',
                background: title.trim() ? '#5a7247' : 'rgba(44,42,37,0.15)',
                border: 'none', borderRadius: '8px', padding: '7px 18px',
                cursor: title.trim() ? 'pointer' : 'default', transition: 'all 200ms ease',
              }}
            >
              {isNew ? 'Add' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Calendar ──────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** A compact event label that keeps the month view readable at narrow widths. */
function CalendarEvent({ item, onSelect }: { item: Commitment; onSelect: (c: Commitment) => void }) {
  const cfg = PRIORITY_CONFIG[item.priority]
  const time = item.all_day ? '' : format(new Date(item.starts_at), 'HH:mm')

  return (
    <button
      onClick={event => {
        event.stopPropagation()
        onSelect(item)
      }}
      title={`${time ? `${time} · ` : ''}${item.title}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        width: '100%',
        minWidth: 0,
        border: 'none',
        borderRadius: '4px',
        padding: '3px 5px',
        background: cfg.bg,
        color: cfg.color,
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        fontSize: '0.58rem',
        lineHeight: 1.25,
        textAlign: 'left',
      }}
    >
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {time && <strong style={{ fontWeight: 500 }}>{time} </strong>}
        {item.title}
      </span>
    </button>
  )
}

// ── Main Panel ─────────────────────────────────────────────────────────────────

export default function Commitments() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Commitment | 'new' | null>(null)
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(new Date()))
  const [focusedDate, setFocusedDate] = useState(new Date())
  const { data: items = [], isLoading, error } = useCommitments()

  const commitmentsByDay = useMemo(() => {
    const grouped = new Map<string, Commitment[]>()
    items.forEach(item => {
      const key = format(new Date(item.starts_at), 'yyyy-MM-dd')
      grouped.set(key, [...(grouped.get(key) ?? []), item])
    })
    return grouped
  }, [items])

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 }),
  })
  const focusedItems = commitmentsByDay.get(format(focusedDate, 'yyyy-MM-dd')) ?? []
  const upcomingCount = items.filter(item => new Date(item.starts_at) >= new Date()).length

  const focusToday = () => {
    const now = new Date()
    setVisibleMonth(startOfMonth(now))
    setFocusedDate(now)
  }

  const openNewForDate = (date: Date) => {
    setFocusedDate(date)
    setSelected('new')
  }

  return (
    <>
      {/* Trigger button — fixed below TopBar, left cluster. */}
      <button
        onClick={() => setOpen(true)}
        title="Calendar"
        style={{
          position: 'fixed',
          top: '72px',
          left: '112px',
          zIndex: 40,
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: open ? 'rgba(90,114,71,0.12)' : 'rgba(248,245,238,0.92)',
          border: '1px solid rgba(44,42,37,0.1)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 2px 10px rgba(44,42,37,0.08)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 200ms ease',
          padding: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(44,42,37,0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
          <path d="M3 9.5h18" />
          <path d="M8 2.5v4M16 2.5v4" />
        </svg>
        {upcomingCount > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            minWidth: '14px', height: '14px', borderRadius: '7px', padding: '0 2px',
            background: '#5a7247', border: '2px solid white',
            fontFamily: 'var(--font-body)', fontSize: '0.48rem', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {upcomingCount}
          </span>
        )}
      </button>

      {/* Wide slide-in panel: month grid above, selected-day agenda below. */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', top: '64px', left: 0, right: 0, bottom: 0, zIndex: 90 }} />
          <div
            style={{
              position: 'fixed',
              top: '64px',
              left: 0,
              bottom: 0,
              zIndex: 100,
              width: 'min(760px, 100vw)',
              background: 'rgba(248,245,238,0.98)',
              backdropFilter: 'blur(16px)',
              borderRight: '1px solid rgba(44,42,37,0.08)',
              boxShadow: '8px 0 40px rgba(44,42,37,0.08)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              padding: 'clamp(16px, 3vw, 28px)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <div>
                <p style={{ ...LABEL, margin: 0 }}>Calendar</p>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.55rem, 4vw, 2.1rem)', fontWeight: 400, color: 'var(--ink)', margin: '3px 0 0', lineHeight: 1 }}>
                  {format(visibleMonth, 'MMMM yyyy')}
                </h2>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => setVisibleMonth(month => subMonths(month, 1))} aria-label="Previous month" style={navButtonStyle}>‹</button>
                <button onClick={focusToday} style={{ ...navButtonStyle, width: 'auto', padding: '0 12px', fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Today</button>
                <button onClick={() => setVisibleMonth(month => addMonths(month, 1))} aria-label="Next month" style={navButtonStyle}>›</button>
                <button onClick={() => openNewForDate(focusedDate)} style={addButtonStyle}>+ Add</button>
                <button onClick={() => setOpen(false)} aria-label="Close calendar" style={{ ...navButtonStyle, marginLeft: '2px' }}>✕</button>
              </div>
            </div>

            <div style={{ border: '1px solid rgba(44,42,37,0.1)', borderRadius: '14px', overflow: 'hidden', background: 'rgba(255,252,245,0.55)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: '1px solid rgba(44,42,37,0.08)' }}>
                {WEEKDAYS.map(day => (
                  <div key={day} style={{ ...LABEL, textAlign: 'center', padding: '8px 2px', fontSize: '0.52rem' }}>{day}</div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                {calendarDays.map((day, index) => {
                  const dayItems = commitmentsByDay.get(format(day, 'yyyy-MM-dd')) ?? []
                  const activeMonth = isSameMonth(day, visibleMonth)
                  const focused = isSameDay(day, focusedDate)
                  const today = isToday(day)

                  return (
                    <div
                      key={day.toISOString()}
                      role="button"
                      tabIndex={0}
                      onClick={() => setFocusedDate(day)}
                      onDoubleClick={() => openNewForDate(day)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setFocusedDate(day)
                        }
                      }}
                      style={{
                        minWidth: 0,
                        minHeight: '86px',
                        padding: '7px 6px',
                        border: 'none',
                        borderRight: index % 7 === 6 ? 'none' : '1px solid rgba(44,42,37,0.07)',
                        borderBottom: index >= calendarDays.length - 7 ? 'none' : '1px solid rgba(44,42,37,0.07)',
                        background: focused ? 'rgba(90,114,71,0.08)' : 'transparent',
                        color: activeMonth ? 'var(--ink)' : 'var(--ink-faint)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        verticalAlign: 'top',
                        overflow: 'hidden',
                      }}
                    >
                      <span style={{
                        width: '22px', height: '22px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: today ? 500 : 400,
                        color: today ? 'white' : 'inherit', background: today ? '#5a7247' : 'transparent',
                        marginBottom: '4px',
                      }}>
                        {format(day, 'd')}
                      </span>

                      <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {dayItems.slice(0, 2).map(item => (
                          <CalendarEvent key={item.id} item={item} onSelect={setSelected} />
                        ))}
                        {dayItems.length > 2 && (
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.55rem', color: 'var(--ink-muted)', paddingLeft: '5px' }}>
                            +{dayItems.length - 2} more
                          </span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ marginTop: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div>
                  <p style={{ ...LABEL, margin: 0 }}>Selected day</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--ink)', margin: '2px 0 0' }}>
                    {format(focusedDate, 'EEEE, d MMMM')}
                  </p>
                </div>
                <button onClick={() => openNewForDate(focusedDate)} style={addButtonStyle}>+ Schedule</button>
              </div>

              {isLoading && <p style={emptyStateStyle}>Loading commitments…</p>}
              {error && <p style={{ ...emptyStateStyle, color: '#a05050' }}>Could not load the calendar.</p>}
              {!isLoading && !error && focusedItems.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {focusedItems.map(item => <CommitmentRow key={item.id} item={item} onSelect={setSelected} />)}
                </div>
              )}
              {!isLoading && !error && focusedItems.length === 0 && (
                <button onClick={() => openNewForDate(focusedDate)} style={{ ...emptyStateStyle, width: '100%', border: '1px dashed rgba(44,42,37,0.14)', borderRadius: '10px', background: 'transparent', cursor: 'pointer' }}>
                  Nothing scheduled. Click to add a commitment.
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {selected !== null && (
        <CommitmentDetail item={selected} initialDate={focusedDate} onClose={() => setSelected(null)} />
      )}
    </>
  )
}

const navButtonStyle: CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  border: '1px solid rgba(44,42,37,0.12)',
  background: 'rgba(255,252,245,0.7)',
  color: 'var(--ink-muted)',
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  fontSize: '1rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const addButtonStyle: CSSProperties = {
  height: '32px',
  borderRadius: '8px',
  padding: '0 12px',
  border: '1px solid rgba(90,114,71,0.2)',
  background: 'rgba(90,114,71,0.09)',
  color: '#5a7247',
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  fontSize: '0.68rem',
}

const emptyStateStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.76rem',
  fontWeight: 300,
  color: 'var(--ink-muted)',
  textAlign: 'center',
  padding: '16px',
}
