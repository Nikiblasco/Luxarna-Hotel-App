import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function ResolveIssueModal({ room, currentStaff, onClose, onComplete }) {
  const [issue, setIssue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchOpenIssue()
  }, [])

  async function fetchOpenIssue() {
    const { data, error } = await supabase
      .from('room_issues')
      .select('*')
      .eq('room_id', room.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching issue:', error)
    } else {
      setIssue(data)
    }
    setLoading(false)
  }

  async function handleResolve() {
    setError('')
    setSaving(true)

    const { error: issueError } = await supabase
      .from('room_issues')
      .update({
        status: 'resolved',
        resolved_by: currentStaff.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', issue.id)

    if (issueError) {
      console.error('Error resolving issue:', issueError)
      setError('Could not resolve issue. Try again.')
      setSaving(false)
      return
    }

    const { error: roomError } = await supabase
      .from('rooms')
      .update({
        status: 'needs_cleaning',
        updated_at: new Date().toISOString(),
      })
      .eq('id', room.id)

    if (roomError) {
      console.error('Error updating room status:', roomError)
      setError('Issue resolved, but room status failed to update.')
      setSaving(false)
      return
    }

    const { error: logError } = await supabase
      .from('activity_log')
      .insert({
        staff_id: currentStaff.id,
        action: `Resolved issue on room ${room.room_number}`,
      })

    if (logError) {
      console.error('Error writing activity log:', logError)
    }

    setSaving(false)
    onComplete()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2>Resolve issue — Room {room.room_number}</h2>

        {loading ? (
          <p className="modal-subtitle">Loading issue details...</p>
        ) : issue ? (
          <>
            <p className="modal-subtitle">Reported issue: {issue.description}</p>
            <p className="modal-subtitle">
              Resolving will send this room to "Needs cleaning" so housekeeping can prep it.
            </p>
          </>
        ) : (
          <p className="modal-subtitle">No open issue found for this room.</p>
        )}

        {error && <p className="login-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleResolve}
            disabled={saving || !issue}
          >
            {saving ? 'Resolving...' : 'Mark resolved'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResolveIssueModal