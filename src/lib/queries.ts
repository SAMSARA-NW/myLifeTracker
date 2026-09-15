import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from './supabase'
import { businessSupabase } from './businessSupabase'
import type {
  Project, Task, DailyCheckin, DailyLog, WeeklyReview, Pattern,
  Product, Expense, Sale, CostComponent, CommunityProject, CommunityTask, Dream,
  FinAccount, FinMonthlyEntry, OpsExpense, OpsExpenseCategory,
} from './supabase'
import { getWeekRange, mondayOfCurrentWeek } from './utils'

// ── PROJECTS ──────────────────────────────────────────────────────────────────

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_projects')
        .select('*')
        .order('priority', { ascending: true })
      if (error) throw error
      return data as Project[]
    },
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_projects')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Project
    },
    enabled: !!id,
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from('ops_projects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Project
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

// ── TASKS ─────────────────────────────────────────────────────────────────────

export function useTasks(projectId?: string) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      let q = supabase.from('ops_tasks').select('*').order('created_at', { ascending: true })
      if (projectId) q = q.eq('project_id', projectId)
      const { data, error } = await q
      if (error) throw error
      return data as Task[]
    },
  })
}

export function useThisWeekTasks() {
  const { start, end } = getWeekRange()
  const startStr = format(start, 'yyyy-MM-dd')
  const endStr = format(end, 'yyyy-MM-dd')
  return useQuery({
    queryKey: ['tasks', 'week', startStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_tasks')
        .select('*')
        .gte('scheduled_date', startStr)
        .lte('scheduled_date', endStr)
        .order('priority', { ascending: true })
      if (error) throw error
      return data as Task[]
    },
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (task: Omit<Task, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('ops_tasks')
        .insert(task)
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from('ops_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ops_tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// ── DAILY CHECKINS ────────────────────────────────────────────────────────────

export function useDailyCheckins(limit = 7) {
  return useQuery({
    queryKey: ['daily_checkins', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_daily_checkins')
        .select('*')
        .order('date', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data as DailyCheckin[]
    },
  })
}

// ── DAILY LOGS ────────────────────────────────────────────────────────────────

export function useDailyLogs(limit = 7) {
  return useQuery({
    queryKey: ['daily_logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_daily_logs')
        .select('*')
        .order('date', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data as DailyLog[]
    },
  })
}

export function useThisWeekLogs() {
  const { start, end } = getWeekRange()
  const startStr = format(start, 'yyyy-MM-dd')
  const endStr = format(end, 'yyyy-MM-dd')
  return useQuery({
    queryKey: ['daily_logs', 'week', startStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_daily_logs')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true })
      if (error) throw error
      return data as DailyLog[]
    },
  })
}

export function useCreateDailyLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (log: Omit<DailyLog, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('ops_daily_logs')
        .insert(log)
        .select()
        .single()
      if (error) throw error
      return data as DailyLog
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily_logs'] })
    },
  })
}

// ── WEEKLY REVIEWS ────────────────────────────────────────────────────────────

export function useWeeklyReviews() {
  return useQuery({
    queryKey: ['weekly_reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_weekly_reviews')
        .select('*')
        .order('week_start', { ascending: false })
      if (error) throw error
      return data as WeeklyReview[]
    },
  })
}

export function useCurrentWeekReview() {
  const weekStart = mondayOfCurrentWeek()
  return useQuery({
    queryKey: ['weekly_reviews', weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_weekly_reviews')
        .select('*')
        .eq('week_start', weekStart)
        .maybeSingle()
      if (error) throw error
      return data as WeeklyReview | null
    },
  })
}

export function useCreateWeeklyReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (review: Omit<WeeklyReview, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('ops_weekly_reviews')
        .insert(review)
        .select()
        .single()
      if (error) throw error
      return data as WeeklyReview
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly_reviews'] })
    },
  })
}

export function useUpdateWeeklyReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WeeklyReview> & { id: string }) => {
      const { data, error } = await supabase
        .from('ops_weekly_reviews')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as WeeklyReview
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly_reviews'] })
    },
  })
}

// ── PATTERNS ──────────────────────────────────────────────────────────────────

export function usePatterns(onlyUnacknowledged = false) {
  return useQuery({
    queryKey: ['patterns', onlyUnacknowledged],
    queryFn: async () => {
      let q = supabase
        .from('ops_patterns')
        .select('*')
        .order('detected_at', { ascending: false })
      if (onlyUnacknowledged) q = q.eq('acknowledged', false)
      const { data, error } = await q
      if (error) throw error
      return data as Pattern[]
    },
  })
}

export function useAcknowledgePattern() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ops_patterns')
        .update({ acknowledged: true })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patterns'] })
    },
  })
}

// ── BUSINESS / OLIVE BRAIN ────────────────────────────────────────────────────

export function useBusinessProducts() {
  return useQuery({
    queryKey: ['business', 'products'],
    queryFn: async () => {
      const { data, error } = await businessSupabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Product[]
    },
  })
}

export function useBusinessCostComponents(productId?: string) {
  return useQuery({
    queryKey: ['business', 'cost_components', productId ?? 'all'],
    queryFn: async () => {
      let q = businessSupabase
        .from('cost_components')
        .select('*')
        .eq('active', true)
      if (productId) q = q.eq('product_id', productId)
      const { data, error } = await q
      if (error) throw error
      return data as CostComponent[]
    },
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (product: Omit<Product, 'id' | 'created_at'>) => {
      const { data, error } = await businessSupabase
        .from('products')
        .insert(product)
        .select()
        .single()
      if (error) throw error
      return data as Product
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business', 'products'] })
    },
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { data, error } = await businessSupabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Product
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business', 'products'] })
    },
  })
}

export function useCreateCostComponent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (component: Omit<CostComponent, 'id'>) => {
      const { data, error } = await businessSupabase
        .from('cost_components')
        .insert(component)
        .select()
        .single()
      if (error) throw error
      return data as CostComponent
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business', 'cost_components'] })
    },
  })
}

export function useDeleteCostComponentsForProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await businessSupabase
        .from('cost_components')
        .delete()
        .eq('product_id', productId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business', 'cost_components'] })
    },
  })
}

export function useSalesData(days = 30) {
  return useQuery({
    queryKey: ['business', 'sales', days],
    queryFn: async () => {
      const since = format(new Date(Date.now() - days * 86400000), 'yyyy-MM-dd')
      const { data, error } = await businessSupabase
        .from('sales')
        .select('*, products(name)')
        .gte('date', since)
        .order('date', { ascending: false })
      if (error) throw error
      return data as (Sale & { products: { name: string } | null })[]
    },
  })
}

export function useExpenses(days = 30) {
  return useQuery({
    queryKey: ['business', 'expenses', days],
    queryFn: async () => {
      const since = format(new Date(Date.now() - days * 86400000), 'yyyy-MM-dd')
      const { data, error } = await businessSupabase
        .from('expenses')
        .select('*')
        .gte('date', since)
        .order('date', { ascending: false })
      if (error) throw error
      return data as Expense[]
    },
  })
}

export function useThisWeekSales() {
  const { start, end } = getWeekRange()
  const startStr = format(start, 'yyyy-MM-dd')
  const endStr = format(end, 'yyyy-MM-dd')
  return useQuery({
    queryKey: ['business', 'sales', 'week', startStr],
    queryFn: async () => {
      try {
        const { data, error } = await businessSupabase
          .from('sales')
          .select('*')
          .gte('date', startStr)
          .lte('date', endStr)
          .order('date', { ascending: true })
        if (error) return [] as Sale[]
        return (data ?? []) as Sale[]
      } catch {
        return [] as Sale[]
      }
    },
    retry: false,
    throwOnError: false,
  })
}

export function usePreviousWeekSales() {
  const { start, end } = getWeekRange(new Date(Date.now() - 7 * 86400000))
  const startStr = format(start, 'yyyy-MM-dd')
  const endStr = format(end, 'yyyy-MM-dd')
  return useQuery({
    queryKey: ['business', 'sales', 'prev_week', startStr],
    queryFn: async () => {
      try {
        const { data, error } = await businessSupabase
          .from('sales')
          .select('*')
          .gte('date', startStr)
          .lte('date', endStr)
          .order('date', { ascending: true })
        if (error) return [] as Sale[]
        return (data ?? []) as Sale[]
      } catch {
        return [] as Sale[]
      }
    },
    retry: false,
    throwOnError: false,
  })
}

export function useCreateSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (sale: Omit<Sale, 'id'>) => {
      const { data, error } = await businessSupabase
        .from('sales')
        .insert(sale)
        .select()
        .single()
      if (error) throw error
      return data as Sale
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business', 'sales'] })
    },
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (expense: Omit<Expense, 'id'>) => {
      const { data, error } = await businessSupabase
        .from('expenses')
        .insert(expense)
        .select()
        .single()
      if (error) throw error
      return data as Expense
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business', 'expenses'] })
    },
  })
}

export function useThisWeekCheckins() {
  const { start, end } = getWeekRange()
  const startStr = format(start, 'yyyy-MM-dd')
  const endStr = format(end, 'yyyy-MM-dd')
  return useQuery({
    queryKey: ['daily_checkins', 'week', startStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_daily_checkins')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true })
      if (error) throw error
      return data as DailyCheckin[]
    },
  })
}

export function usePreviousWeekCheckins() {
  const { start, end } = getWeekRange(new Date(Date.now() - 7 * 86400000))
  const startStr = format(start, 'yyyy-MM-dd')
  const endStr = format(end, 'yyyy-MM-dd')
  return useQuery({
    queryKey: ['daily_checkins', 'prev_week', startStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_daily_checkins')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true })
      if (error) throw error
      return data as DailyCheckin[]
    },
  })
}


// ── COMMUNITY PROJECTS ────────────────────────────────────────────────────────

export function useCommunityProjects(realm: string) {
  return useQuery({
    queryKey: ['community_projects', realm],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('realm', realm)
        .eq('archived', false)
        .is('completed_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as CommunityProject[]
    },
    enabled: !!realm,
  })
}

export function useCommunityProjectTasks(projectId: string) {
  return useQuery({
    queryKey: ['community_tasks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project', projectId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as CommunityTask[]
    },
    enabled: !!projectId,
  })
}

export function useFarmTasks() {
  return useQuery({
    queryKey: ['farm_tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_tasks')
        .select('id, name, status, project, created_at, start_date, end_date, description, projects!inner(title, realm)')
        .eq('projects.realm', 'vrischgewagt')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as (CommunityTask & { projects: { title: string; realm: string } })[]
    },
  })
}

export function useUpdateFarmTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { error } = await supabase
        .from('project_tasks')
        .update({ status })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farm_tasks'] })
    },
  })
}

export function useDeleteFarmTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('project_tasks')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farm_tasks'] })
    },
  })
}

// ── DREAMS ────────────────────────────────────────────────────────────────────

export function useDreams(limit = 30) {
  return useQuery({
    queryKey: ['dreams', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_dreams')
        .select('*')
        .order('date', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data as Dream[]
    },
  })
}

export function useThisWeekDreams() {
  const { start, end } = getWeekRange()
  const startStr = format(start, 'yyyy-MM-dd')
  const endStr = format(end, 'yyyy-MM-dd')
  return useQuery({
    queryKey: ['dreams', 'week', startStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_dreams')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true })
      if (error) throw error
      return data as Dream[]
    },
  })
}

export function useCreateDream() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dream: Omit<Dream, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('ops_dreams')
        .insert(dream)
        .select()
        .single()
      if (error) throw error
      return data as Dream
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dreams'] })
    },
  })
}

export function useUpdateDream() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Dream> & { id: string }) => {
      const { data, error } = await supabase
        .from('ops_dreams')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Dream
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dreams'] })
    },
  })
}

export function useDeleteDream() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ops_dreams').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dreams'] })
    },
  })
}

// ── FINANCES ──────────────────────────────────────────────────────────────────

export function useFinAccounts() {
  return useQuery({
    queryKey: ['fin_accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fin_accounts')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as FinAccount[]
    },
  })
}

export function useFinEntries() {
  return useQuery({
    queryKey: ['fin_entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fin_monthly_entries')
        .select('*')
        .order('month', { ascending: true })
      if (error) throw error
      return data as FinMonthlyEntry[]
    },
  })
}

export function useUpsertFinEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (entry: Omit<FinMonthlyEntry, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('fin_monthly_entries')
        .upsert(entry, { onConflict: 'account_id,month' })
        .select()
        .single()
      if (error) throw error
      return data as FinMonthlyEntry
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin_entries'] })
    },
  })
}

export function useCreateFinAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (account: Omit<FinAccount, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('fin_accounts')
        .insert(account)
        .select()
        .single()
      if (error) throw error
      return data as FinAccount
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin_accounts'] })
    },
  })
}

// ── EXPENSE TRACKER ───────────────────────────────────────────────────────────

export function useOpsExpenses(month: string) {
  return useQuery({
    queryKey: ['ops_expenses', month],
    queryFn: async () => {
      const [year, monthNumber] = month.split('-').map(Number)
      const nextMonth = monthNumber === 12
        ? `${year + 1}-01`
        : `${year}-${String(monthNumber + 1).padStart(2, '0')}`

      const { data, error } = await supabase
        .from('ops_expenses')
        .select('*')
        .gte('date', `${month}-01`)
        .lt('date', `${nextMonth}-01`)
        .order('date', { ascending: false })
      if (error) throw error
      return data as OpsExpense[]
    },
  })
}

export function useCreateOpsExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (expense: Omit<OpsExpense, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('ops_expenses')
        .insert(expense)
        .select()
        .single()
      if (error) throw error
      return data as OpsExpense
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ops_expenses'] })
    },
  })
}


/** Delete one expense and refresh every currently visible month. */
export function useDeleteOpsExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ops_expenses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ops_expenses'] }),
  })
}

/** User-managed category list, with seeded categories returned first. */
export function useOpsExpenseCategories() {
  return useQuery({
    queryKey: ['ops_expense_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ops_expense_categories').select('*')
        .order('is_builtin', { ascending: false }).order('created_at', { ascending: true })
      if (error) throw error
      return data as OpsExpenseCategory[]
    },
  })
}

export function useCreateOpsExpenseCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (category: Pick<OpsExpenseCategory, 'name' | 'color'>) => {
      const { data, error } = await supabase.from('ops_expense_categories')
        .insert({ ...category, is_builtin: false }).select().single()
      if (error) throw error
      return data as OpsExpenseCategory
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ops_expense_categories'] }),
  })
}

export function useDeleteOpsExpenseCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ops_expense_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ops_expense_categories'] }),
  })
}
