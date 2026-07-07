import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function Notifications({ currentStaff, onClose }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const isManager = currentStaff?.role === 'manager'

  useEffect(() => {
    fetchNotifications()
  }, [])

  async function fetchNotifications() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    if (isManager) {
      // MANAGER VIEW: Pull tasks that are pending approval
      const { data, error } = await supabase
        .from('daily_tasks')
        .select(`
          id,
          title,
          description,
          created_at,
          status,
          daily_task_assignments(staff(name))
        `)
        .eq('status', 'pending_review')
        .eq('date', today)
        .order('created_at', { ascending: false })

      if (!error) setNotifications(data || [])
    } else {
      // STAFF VIEW: Pull assignments matching their ID
      const { data, error } = await supabase
        .from('daily_task_assignments')
        .select(`
          id,
          seen,
          created_at,
          daily_tasks(title, description, created_at, staff(name))
        `)
        .eq('staff_id', currentStaff.id)
        .order('created_at', { ascending: false })

      if (!error) {
        setNotifications(data || [])
        markAllSeen(data)
      }
    }
    setLoading(false)
  }

  async function markAllSeen(data) {
    if (isManager) return // Managers don't need to clear an assignment "seen" flag
    const unseenIds = data.filter((n) => !n.seen).map((n) => n.id)
    if (unseenIds.length === 0) return

    await supabase
      .from('daily_task_assignments')
      .update({ seen: true })
      .in('id', unseenIds)
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="activity-log-screen">
      <div className="app-header">
        <h1>{isManager ? 'Review Dashboard' : 'Notifications'}</h1>
        <button className="btn-secondary" onClick={onClose}>Back</button>
      </div>

      {loading ? (
        <p style={{ color: '#999' }}>Loading updates...</p>
      ) : notifications.length === 0 ? (
        <p style={{ color: '#999' }}>
          {isManager ? 'No tasks pending manager review right now.' : 'No notifications yet.'}
        </p>
      ) : (
        <div className="al-feed">
          {notifications.map((item, index) => {
            // Unify variables since schemas differ between manager view and staff view
            const title = isManager ? item.title : item.daily_tasks?.title
            const desc = isManager ? item.description : item.daily_tasks?.description
            const time = item.created_at
            const assignees = isManager 
              ? item.daily_task_assignments?.map(a => a.staff?.name).join(', ')
              : null

            return (
              <div key={item.id}>
                <div className="al-row">
                  <div
                    className="al-avatar"
                    style={{ backgroundColor: isManager ? '#3a2e1a' : '#1a2a3a', color: isManager ? '#ebd285' : '#85b7eb' }}
                  >
                    <span style={{ fontSize: '18px' }}>{isManager ? '⏳' : '📋'}</span>
                  </div>
                  <div className="al-content">
                    <div className="al-line1">
                      <span className="al-name">
                        {title}
                        {isManager && (
                          <span style={{ marginLeft: '8px', backgroundColor: '#d4af37', color: '#000', fontSize: '10px', padding: '2px 6px', fontWeight: 'bold' }}>
                            Needs Approval
                          </span>
                        )}
                        {!isManager && !item.seen && (
                          <span style={{ marginLeft: '8px', backgroundColor: '#185fa5', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '6px' }}>New</span>
                        )}
                      </span>
                      <span className="al-time">{formatTime(time)}</span>
                    </div>
                    {desc && <p className="al-action">{desc}</p>}
                    
                    <p className="al-action" style={{ color: '#777', fontSize: '12px' }}>
                      {isManager ? `Assigned to: ${assignees || 'Nobody'}` : `Assigned by ${item.daily_tasks?.staff?.name || 'Manager'}`}
                    </p>
                  </div>
                </div>
                {index < notifications.length - 1 && <div className="al-divider" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Notifications