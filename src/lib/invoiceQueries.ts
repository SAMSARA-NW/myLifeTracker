import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessSupabase } from './businessSupabase'
import type {
  Invoice, Client, Product, BankDetails, InvoiceStatus,
  BusinessType, CreateInvoicePayload,
} from './invoiceTypes'

export function useInvoices(status?: InvoiceStatus) {
  return useQuery({
    queryKey: ['invoices', status ?? 'all'],
    queryFn: async () => {
      let q = businessSupabase
        .from('invoices')
        .select('*, client:clients(*), items:invoice_items(*)')
        .order('created_at', { ascending: false })
      if (status) q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      return data as Invoice[]
    },
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data, error } = await businessSupabase
        .from('invoices')
        .select('*, client:clients(*), items:invoice_items(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Invoice
    },
    enabled: !!id,
  })
}

export function useClients() {
  return useQuery({
    queryKey: ['business_clients'],
    queryFn: async () => {
      const { data, error } = await businessSupabase
        .from('clients')
        .select('*')
        .order('name')
      if (error) throw error
      return data as Client[]
    },
  })
}

export function useBusinessProducts(business: BusinessType) {
  return useQuery({
    queryKey: ['business_products', business],
    queryFn: async () => {
      const { data, error } = await businessSupabase
        .from('products')
        .select('*')
        .eq('business', business)
        .order('name')
      if (error) throw error
      return data as Product[]
    },
    enabled: !!business,
  })
}

export function useBankDetails(business: BusinessType) {
  return useQuery({
    queryKey: ['bank_details', business],
    queryFn: async () => {
      const { data, error } = await businessSupabase
        .from('bank_details')
        .select('*')
        .eq('business', business)
        .single()
      // Never hide an access failure behind hard-coded financial information.
      if (error) throw error
      return data as BankDetails
    },
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (client: { name: string; email?: string; phone?: string; address?: string }) => {
      const { data, error } = await businessSupabase
        .from('clients')
        .insert({
          name: client.name,
          email: client.email || null,
          phone: client.phone || null,
          address: client.address || null,
        })
        .select()
        .single()
      if (error) throw error
      return data as Client
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_clients'] })
    },
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateInvoicePayload) => {
      // Generate invoice number via RPC
      const { data: invoiceNumber, error: rpcError } = await businessSupabase
        .rpc('generate_invoice_number', { biz: payload.business })
      if (rpcError) throw rpcError

      // Create invoice
      const { data: invoice, error: invoiceError } = await businessSupabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          business: payload.business,
          client_id: payload.client_id,
          status: 'draft',
          issue_date: payload.issue_date,
          due_date: payload.due_date,
          delivery_fee: payload.delivery_fee,
          notes: payload.notes || null,
        })
        .select()
        .single()
      if (invoiceError) throw invoiceError

      // Create invoice items — omit line_total and id (auto-generated)
      if (payload.items.length > 0) {
        const { error: itemsError } = await businessSupabase
          .from('invoice_items')
          .insert(
            payload.items.map(item => ({
              invoice_id: invoice.id,
              product_id: item.product_id || null,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
            }))
          )
        if (itemsError) throw itemsError
      }

      return invoice as Invoice
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InvoiceStatus }) => {
      const { data, error } = await businessSupabase
        .from('invoices')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Invoice
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['invoice', id] })
    },
  })
}
