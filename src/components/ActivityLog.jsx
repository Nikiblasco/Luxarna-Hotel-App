import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const DEPT_COLORS = {
  receptionist: { bg: '#1a2a3a', text: '#85b7eb' },
  manager: { bg: '#26215c', text: '#afa9ec' },
  cook: { bg: '#3a2418', text: '#f0997b' },
  bartender: { bg: '#26215c', text: '#afa9ec' },
  housekeeper: { bg: '#04342c', text: '#5dcaa5' },
}

function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function ActivityLog({ onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    const { data, error } = await supabase
      .from('activity_log')
      .select('id, action, created_at, staff(name, role)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching activity log:', error)
    } else {
      setLogs(groupClaimsUnderCompletions(data))
    }
    setLoading(false)
  }

  // Pairs a "Claimed X" entry with the "Completed X" entry that follows it,
  // so they render nested together instead of as two equal-weight rows.
  function groupClaimsUnderCompletions(rawLogs) {
    const result = []
    const used = new Set()

    rawLogs.forEach((log, index) => {
      if (used.has(log.id)) return

      if (log.action.startsWith('Completed') || log.action.startsWith('Resolved')) {
        const taskName = log.action.replace(/^(Completed|Resolved)\s/, '')
        const claim = rawLogs
          .slice(index + 1)
          .find(
            (l) =>
              !used.has(l.id) &&
              l.staff?.name === log.staff?.name &&
              (l.action.includes(taskName.split(':')[0]) || l.action.startsWith('Claimed'))
          )

        if (claim) {
          used.add(claim.id)
          result.push({ ...log, claimEntry: claim })
          return
        }
      }

      result.push(log)
    })

    return result
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="activity-log-screen">
      <div className="app-header">
        <h1>Activity log</h1>
        <button className="btn-secondary" onClick={onClose}>
          Back to rooms
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#999' }}>Loading activity...</p>
      ) : logs.length === 0 ? (
        <p style={{ color: '#999' }}>No activity recorded yet.</p>
      ) : (
        <div className="al-feed">
          {logs.map((log, index) => {
            const role = log.staff?.role || 'manager'
            const colors = DEPT_COLORS[role] || DEPT_COLORS.manager
            const name = log.staff?.name || 'Unknown staff'

            return (
              <div key={log.id}>
                <div className="al-row">
                  <div
                    className="al-avatar"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    {getInitials(name)}
                  </div>
                  <div className="al-content">
                    <div className="al-line1">
                      <span className="al-name">{name}</span>
                      <span className="al-time">{formatTime(log.created_at)}</span>
                    </div>
                    <p className="al-action">{log.action}</p>
                  </div>
                </div>

                {log.claimEntry && (
                  <div className="al-subrow">
                    <span>Claimed same task</span>
                    <span className="al-time">{formatTime(log.claimEntry.created_at)}</span>
                  </div>
                )}

                {index < logs.length - 1 && <div className="al-divider" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ActivityLog