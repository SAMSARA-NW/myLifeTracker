import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TopBar from './components/layout/TopBar'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetailPage from './pages/ProjectDetail'
import Reviews from './pages/Reviews'
import Business from './pages/Business'
import Journal from './pages/Journal'
import OliveRehab from './pages/OliveRehab'
import Todos from './pages/Todos'
import Dreams from './pages/Dreams'
import Finances from './pages/Finances'
import HumanOverview from './pages/HumanOverview'
import Invoices from './pages/Invoices'
import InvoiceDetail from './components/invoices/InvoiceDetail'
import BusinessAccess from './components/BusinessAccess'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="samsara-bg">
          <TopBar />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/business" element={<BusinessAccess><Business /></BusinessAccess>} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/olive-rehab" element={<OliveRehab />} />
              <Route path="/todos" element={<Todos />} />
              <Route path="/dreams" element={<Dreams />} />
              <Route path="/finances" element={<Finances />} />
              <Route path="/human" element={<HumanOverview />} />
              <Route path="/invoices" element={<BusinessAccess><Invoices /></BusinessAccess>} />
              <Route path="/invoices/:id" element={<BusinessAccess><InvoiceDetail /></BusinessAccess>} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
