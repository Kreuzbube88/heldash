import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { Plus, Trash2, Users, Shield } from 'lucide-react'

export function SettingsPage() {
  const {
    settings, updateSettings, groups, createGroup, deleteGroup,
    isAdmin, authUser,
    users, loadUsers, createUser, deleteUser,
    userGroups, loadUserGroups, createUserGroup, deleteUserGroup,
  } = useStore()
  const [title, setTitle] = useState(settings?.dashboard_title ?? 'HELDASH')
  const [newGroup, setNewGroup] = useState('')
  const [saving, setSaving] = useState(false)

  // New user form
  const [newUser, setNewUser] = useState({ username: '', first_name: '', last_name: '', email: '', password: '', role: 'user' })
  const [userError, setUserError] = useState('')
  const [addingUser, setAddingUser] = useState(false)

  // New user-group form
  const [newUG, setNewUG] = useState({ name: '', description: '' })

  useEffect(() => {
    if (isAdmin) {
      loadUsers()
      loadUserGroups()
    }
  }, [isAdmin])

  if (!settings) return null

  const saveTitle = async () => {
    setSaving(true)
    await updateSettings({ dashboard_title: title })
    setSaving(false)
  }

  const handleAddGroup = async () => {
    if (!newGroup.trim()) return
    await createGroup({ name: newGroup.trim() })
    setNewGroup('')
  }

  const handleAddUser = async () => {
    setUserError('')
    if (!newUser.username.trim()) return setUserError('Username required')
    if (!newUser.first_name.trim()) return setUserError('First name required')
    if (!newUser.last_name.trim()) return setUserError('Last name required')
    if (newUser.password.length < 8) return setUserError('Password min. 8 characters')
    setAddingUser(true)
    try {
      await createUser({
        username: newUser.username.trim(),
        first_name: newUser.first_name.trim(),
        last_name: newUser.last_name.trim(),
        email: newUser.email.trim() || undefined,
        password: newUser.password,
        role: newUser.role,
      } as any)
      setNewUser({ username: '', first_name: '', last_name: '', email: '', password: '', role: 'user' })
    } catch (e: any) {
      setUserError(e.message)
    } finally {
      setAddingUser(false)
    }
  }

  const handleAddUserGroup = async () => {
    if (!newUG.name.trim()) return
    await createUserGroup({ name: newUG.name.trim(), description: newUG.description.trim() || undefined })
    setNewUG({ name: '', description: '' })
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* General */}
      <section className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }}>
        <h3 style={{ marginBottom: 20, fontSize: 15, fontWeight: 600 }}>General</h3>
        <div className="form-group">
          <label className="form-label">Dashboard Title</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} />
            <button className="btn btn-primary" onClick={saveTitle} disabled={saving} style={{ flexShrink: 0 }}>
              {saving ? '...' : 'Save'}
            </button>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }}>
        <h3 style={{ marginBottom: 20, fontSize: 15, fontWeight: 600 }}>Appearance</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Use the theme toggle (☀/🌙) and accent color dots in the top bar to change the look. Settings are saved automatically.
        </p>
        <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Current:</span>
          <span className="glass" style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            {settings.theme_mode} / {settings.theme_accent}
          </span>
        </div>
      </section>

      {/* App Groups */}
      <section className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }}>
        <h3 style={{ marginBottom: 20, fontSize: 15, fontWeight: 600 }}>App Groups</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {groups.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No groups yet.</p>
          )}
          {groups.map(g => (
            <div key={g.id} className="glass" style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: 'var(--radius-md)', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14 }}>{g.icon ? `${g.icon} ` : ''}{g.name}</span>
              {isAdmin && (
                <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteGroup(g.id)} style={{ padding: '4px', width: 28, height: 28 }}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" value={newGroup} onChange={e => setNewGroup(e.target.value)} placeholder="New group name" onKeyDown={e => e.key === 'Enter' && handleAddGroup()} />
            <button className="btn btn-primary" onClick={handleAddGroup} style={{ flexShrink: 0 }}>
              <Plus size={14} /> Add
            </button>
          </div>
        )}
      </section>

      {/* User Management — admin only */}
      {isAdmin && (
        <section className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }}>
          <h3 style={{ marginBottom: 4, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={15} /> Users
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Logged in as: <strong>{authUser?.username}</strong>
          </p>

          {/* User list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {users.map(u => (
              <div key={u.id} className="glass" style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: 'var(--radius-md)', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{u.username}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {u.first_name} {u.last_name}
                    {u.email ? ` · ${u.email}` : ''}
                    {' · '}
                    <span style={{ color: u.role === 'admin' ? 'var(--accent)' : 'var(--text-muted)' }}>{u.role}</span>
                  </div>
                </div>
                {u.id !== authUser?.sub && (
                  <button
                    className="btn btn-danger btn-icon btn-sm"
                    onClick={() => { if (confirm(`Delete user "${u.username}"?`)) deleteUser(u.id) }}
                    style={{ padding: '4px', width: 28, height: 28, flexShrink: 0 }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add user form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Add User</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" placeholder="Username *" value={newUser.username} onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))} style={{ flex: 1 }} />
              <select className="form-input" value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))} style={{ flexShrink: 0, width: 100 }}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" placeholder="First Name *" value={newUser.first_name} onChange={e => setNewUser(u => ({ ...u, first_name: e.target.value }))} style={{ flex: 1 }} />
              <input className="form-input" placeholder="Last Name *" value={newUser.last_name} onChange={e => setNewUser(u => ({ ...u, last_name: e.target.value }))} style={{ flex: 1 }} />
            </div>
            <input className="form-input" placeholder="Email (optional)" type="email" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" placeholder="Password (min. 8 chars) *" type="password" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={handleAddUser} disabled={addingUser} style={{ flexShrink: 0 }}>
                <Plus size={14} /> Add
              </button>
            </div>
            {userError && <div style={{ fontSize: 12, color: 'var(--status-offline)' }}>{userError}</div>}
          </div>
        </section>
      )}

      {/* User Groups — admin only */}
      {isAdmin && (
        <section className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={15} /> User Groups
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {userGroups.map(g => (
              <div key={g.id} className="glass" style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: 'var(--radius-md)', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {g.name}
                    {g.is_system && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 'var(--radius-sm)', background: 'var(--glass-bg)', color: 'var(--text-muted)', border: '1px solid var(--glass-border)' }}>system</span>}
                  </div>
                  {g.description && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{g.description}</div>}
                </div>
                {!g.is_system && (
                  <button
                    className="btn btn-danger btn-icon btn-sm"
                    onClick={() => { if (confirm(`Delete group "${g.name}"?`)) deleteUserGroup(g.id) }}
                    style={{ padding: '4px', width: 28, height: 28, flexShrink: 0 }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" placeholder="Group name" value={newUG.name} onChange={e => setNewUG(g => ({ ...g, name: e.target.value }))} style={{ flex: 1 }} />
            <input className="form-input" placeholder="Description (optional)" value={newUG.description} onChange={e => setNewUG(g => ({ ...g, description: e.target.value }))} style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={handleAddUserGroup} style={{ flexShrink: 0 }}>
              <Plus size={14} /> Add
            </button>
          </div>
        </section>
      )}

      {/* OIDC — placeholder */}
      <section className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 24, opacity: 0.5, pointerEvents: 'none' }}>
        <h3 style={{ marginBottom: 8, fontSize: 15, fontWeight: 600 }}>OIDC / SSO</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          🔒 OIDC integration via voidauth — coming in a future phase. User records are already prepared with email, first/last name, and OIDC fields.
        </p>
      </section>

    </div>
  )
}
