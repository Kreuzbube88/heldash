import { LayoutDashboard, Settings, Server, Info } from 'lucide-react'
import { useStore } from '../store/useStore'

interface Props {
  page: string
  onNavigate: (page: string) => void
}

export function Sidebar({ page, onNavigate }: Props) {
  const { settings } = useStore()
  const title = settings?.dashboard_title ?? 'HELDASH'

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⬡</div>
        <span className="sidebar-logo-text">{title}</span>
      </div>

      <span className="nav-section-label">Navigation</span>

      <NavItem icon={<LayoutDashboard size={16} />} label="Dashboard" active={page === 'dashboard'} onClick={() => onNavigate('dashboard')} />
      <NavItem icon={<Server size={16} />} label="Services" active={page === 'services'} onClick={() => onNavigate('services')} />

      <span className="nav-section-label" style={{ marginTop: 8 }}>System</span>
      <NavItem icon={<Settings size={16} />} label="Settings" active={page === 'settings'} onClick={() => onNavigate('settings')} />
      <NavItem icon={<Info size={16} />} label="About" active={page === 'about'} onClick={() => onNavigate('about')} />
    </aside>
  )
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick} style={{ width: '100%', textAlign: 'left', background: 'none', fontFamily: 'var(--font-sans)' }}>
      {icon}
      <span>{label}</span>
    </button>
  )
}
