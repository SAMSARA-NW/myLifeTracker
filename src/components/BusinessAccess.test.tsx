import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import BusinessAccess from './BusinessAccess'

const auth = vi.hoisted(() => ({
  callback: undefined as undefined | ((event: string, session: unknown) => void),
  signInWithOtp: vi.fn(), verifyOtp: vi.fn(), signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
}))
vi.mock('../lib/businessSupabase', () => ({ businessSupabase: { auth } }))

/** Exercise authorization boundaries, not just the form's rendered markup. */
describe('BusinessAccess', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_BUSINESS_OWNER_ID', 'owner-id')
    auth.onAuthStateChange.mockImplementation((callback) => {
      auth.callback = callback
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    auth.signInWithOtp.mockResolvedValue({ error: null })
    auth.verifyOtp.mockResolvedValue({ error: null })
    auth.signOut.mockResolvedValue({ error: null })
  })
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

  function mount() {
    const cache = new QueryClient()
    render(<QueryClientProvider client={cache}><BusinessAccess><p>Private business records</p></BusinessAccess></QueryClientProvider>)
    return cache
  }
  function session(id?: string) {
    act(() => auth.callback?.('INITIAL_SESSION', id ? { user: { id } } : null))
  }

  it('does not mount private content while loading, signed out, or logged in as another user', () => {
    mount()
    expect(screen.queryByText('Private business records')).toBeNull()
    session()
    expect(screen.queryByText('Private business records')).toBeNull()
    session('another-id')
    expect(screen.queryByText('Private business records')).toBeNull()
    session('owner-id')
    expect(screen.getByText('Private business records')).toBeInTheDocument()
  })

  it('requests an email code without allowing public account creation', async () => {
    mount(); session()
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'owner@example.com' } })
    fireEvent.click(screen.getByText('Email me a code'))
    await waitFor(() => expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: 'owner@example.com', options: { shouldCreateUser: false } }))
    await screen.findByLabelText('Sign-in code')
    fireEvent.change(screen.getByLabelText('Sign-in code'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'owner@example.com', token: '123456', type: 'email' }))
    expect(screen.queryByText('Private business records')).toBeNull()
  })

  it('removes both private content and cached records after sign-out', async () => {
    const cache = mount(); session('owner-id')
    cache.setQueryData(['invoices'], ['private'])
    fireEvent.click(screen.getByText('Sign out of business'))
    await waitFor(() => expect(screen.queryByText('Private business records')).toBeNull())
    expect(cache.getQueryData(['invoices'])).toBeUndefined()
  })

  it('fails closed when the owner identifier is missing', () => {
    vi.stubEnv('VITE_BUSINESS_OWNER_ID', '')
    mount(); session('owner-id')
    expect(screen.queryByText('Private business records')).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('being configured')
  })
})
