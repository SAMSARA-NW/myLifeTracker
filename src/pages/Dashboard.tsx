import { useNavigate } from 'react-router-dom'
import WeeklyDashboard from '../components/dashboard/WeeklyDashboard'
import ReadingList from '../components/dashboard/ReadingList'
import Commitments from '../components/dashboard/Commitments'

export default function Dashboard() {
  const navigate = useNavigate()
  return (
    <>
      <WeeklyDashboard />
      <ReadingList />
      <Commitments />

      {/* Human Overview button — fixed below TopBar, left side */}
      <button
        onClick={() => navigate('/human')}
        title="Human Overview"
        style={{
          position: 'fixed',
          top: '72px',
          left: '24px',
          zIndex: 40,
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: 'rgba(248,245,238,0.92)',
          border: '1px solid rgba(44,42,37,0.1)',
          backdropFilter: 'blur(8px)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(44,42,37,0.12)',
          padding: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(44,42,37,0.72)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="6" r="3.5" />
          <path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" />
        </svg>
      </button>

      {/* EBN Nexus button — opens the EBN project dashboard in a new tab */}
      <a
        href="https://nexus.engineeredbynature.earth"
        target="_blank"
        rel="noopener noreferrer"
        title="EBN Nexus"
        style={{
          position: 'fixed',
          top: '72px',
          left: '68px',
          zIndex: 40,
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: 'rgba(248,245,238,0.92)',
          border: '1px solid rgba(44,42,37,0.1)',
          backdropFilter: 'blur(8px)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(44,42,37,0.12)',
          textDecoration: 'none',
        }}
      >
        {/* Compass-N icon — EBN Nexus hub */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(44,42,37,0.72)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 19 21 12 17 5 21 12 2" />
        </svg>
      </a>
    </>
  )
}
