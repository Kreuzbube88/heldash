import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { getDb } from '../db/database'

interface UserRow {
  id: string
  username: string
  password_hash: string | null
  role: string
  email: string | null
  first_name: string | null
  last_name: string | null
  user_group_id: string | null
  is_active: number
  last_login: string | null
  created_at: string
  updated_at: string
}

interface UserGroupRow {
  id: string
  name: string
  description: string | null
  is_system: number
  created_at: string
}

interface CreateUserBody {
  username: string
  password: string
  first_name: string
  last_name: string
  email?: string
  role?: string
  user_group_id?: string
}

interface PatchUserBody {
  username?: string
  password?: string
  first_name?: string
  last_name?: string
  email?: string
  role?: string
  user_group_id?: string
  is_active?: boolean
}

interface CreateGroupBody {
  name: string
  description?: string
}

function sanitizeUser(u: UserRow) {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    user_group_id: u.user_group_id,
    is_active: u.is_active === 1,
    last_login: u.last_login,
    created_at: u.created_at,
  }
}

export async function usersRoutes(app: FastifyInstance) {
  const db = getDb()

  // ── User endpoints (admin-only) ────────────────────────────────────────────

  // GET /api/users
  app.get('/api/users', { preHandler: [app.requireAdmin] }, async () => {
    const rows = db.prepare('SELECT * FROM users ORDER BY created_at').all() as UserRow[]
    return rows.map(sanitizeUser)
  })

  // POST /api/users
  app.post<{ Body: CreateUserBody }>('/api/users', { preHandler: [app.requireAdmin] }, async (req, reply) => {
    const { username, password, first_name, last_name, email, role, user_group_id } = req.body
    if (!username?.trim()) return reply.status(400).send({ error: 'username is required' })
    if (!password || password.length < 8) return reply.status(400).send({ error: 'password must be at least 8 characters' })
    if (!first_name?.trim()) return reply.status(400).send({ error: 'first_name is required' })
    if (!last_name?.trim()) return reply.status(400).send({ error: 'last_name is required' })

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim())
    if (existing) return reply.status(409).send({ error: 'Username already taken' })

    const password_hash = await bcrypt.hash(password, 12)
    const id = nanoid()
    const userRole = role === 'admin' ? 'admin' : 'user'
    const groupId = user_group_id ?? (userRole === 'admin' ? 'grp_admin' : 'grp_guest')

    db.prepare(`
      INSERT INTO users (id, username, password_hash, role, email, first_name, last_name, user_group_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(id, username.trim(), password_hash, userRole, email?.trim() ?? null, first_name.trim(), last_name.trim(), groupId)

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow
    return reply.status(201).send(sanitizeUser(user))
  })

  // PATCH /api/users/:id
  app.patch<{ Params: { id: string }; Body: PatchUserBody }>('/api/users/:id', { preHandler: [app.requireAdmin] }, async (req, reply) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as UserRow | undefined
    if (!user) return reply.status(404).send({ error: 'Not found' })

    const updates: string[] = ["updated_at = datetime('now')"]
    const values: unknown[] = []

    const { username, password, first_name, last_name, email, role, user_group_id, is_active } = req.body

    if (username !== undefined) { updates.push('username = ?'); values.push(username.trim()) }
    if (first_name !== undefined) { updates.push('first_name = ?'); values.push(first_name.trim()) }
    if (last_name !== undefined) { updates.push('last_name = ?'); values.push(last_name.trim()) }
    if (email !== undefined) { updates.push('email = ?'); values.push(email?.trim() ?? null) }
    if (role !== undefined) { updates.push('role = ?'); values.push(role === 'admin' ? 'admin' : 'user') }
    if (user_group_id !== undefined) { updates.push('user_group_id = ?'); values.push(user_group_id) }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0) }
    if (password) {
      if (password.length < 8) return reply.status(400).send({ error: 'password must be at least 8 characters' })
      updates.push('password_hash = ?')
      values.push(await bcrypt.hash(password, 12))
    }

    values.push(req.params.id)
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values)

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as UserRow
    return sanitizeUser(updated)
  })

  // DELETE /api/users/:id
  app.delete<{ Params: { id: string } }>('/api/users/:id', { preHandler: [app.requireAdmin] }, async (req, reply) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as UserRow | undefined
    if (!user) return reply.status(404).send({ error: 'Not found' })
    // Prevent deleting yourself
    if (req.user.sub === req.params.id) return reply.status(400).send({ error: 'Cannot delete your own account' })
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
    return reply.status(204).send()
  })

  // ── User-group endpoints (admin-only) ──────────────────────────────────────

  // GET /api/user-groups
  app.get('/api/user-groups', { preHandler: [app.requireAdmin] }, async () => {
    return db.prepare('SELECT * FROM user_groups ORDER BY is_system DESC, name').all()
  })

  // POST /api/user-groups
  app.post<{ Body: CreateGroupBody }>('/api/user-groups', { preHandler: [app.requireAdmin] }, async (req, reply) => {
    const { name, description } = req.body
    if (!name?.trim()) return reply.status(400).send({ error: 'name is required' })
    const id = nanoid()
    db.prepare('INSERT INTO user_groups (id, name, description, is_system) VALUES (?, ?, ?, 0)')
      .run(id, name.trim(), description?.trim() ?? null)
    return reply.status(201).send(db.prepare('SELECT * FROM user_groups WHERE id = ?').get(id))
  })

  // DELETE /api/user-groups/:id
  app.delete<{ Params: { id: string } }>('/api/user-groups/:id', { preHandler: [app.requireAdmin] }, async (req, reply) => {
    const group = db.prepare('SELECT * FROM user_groups WHERE id = ?').get(req.params.id) as UserGroupRow | undefined
    if (!group) return reply.status(404).send({ error: 'Not found' })
    if (group.is_system) return reply.status(400).send({ error: 'Cannot delete system groups' })
    db.prepare('DELETE FROM user_groups WHERE id = ?').run(req.params.id)
    return reply.status(204).send()
  })
}
