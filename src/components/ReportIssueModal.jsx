import { useState } from 'react'
import { supabase } from '../supabaseClient'

function ReportIssueModal({ room, currentStaff, onClose, onComplete }) {
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleReport(e) {
    e.preventDefault()
    setError('')

    if (!description.trim()) {
      setError('Please describe the issue')
      return
    }

    setSaving(true)

    const { error: issueError } = await supabase
      .from('room_issues')
      .insert({
        room_id: room.id,
        reported_by: currentStaff.id,
        description: description.trim(),
        status: 'open',
      })

    if (issueError) {
      console.error('Error reporting issue:', issueError)
      setError('Could not report issue. Try again.')
      setSaving(false)
      return
    }

    const { error: roomError } = await supabase
      .from('rooms')
      .update({
        status: 'out_of_service',
        updated_at: new Date().toISOString(),
      })
      .eq('id', room.id)

    if (roomError) {
      console.error('Error updating room status:', roomError)
      setError('Issue logged, but room status failed to update.')
      setSaving(false)
      return
    }

    const { error: logError } = await supabase
      .from('activity_log')
      .insert({
        staff_id: currentStaff.id,
        action: `Reported issue on room ${room.room_number}: ${description.trim()}`,
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
        <h2>Report issue — Room {room.room_number}</h2>
        <p className="modal-subtitle">
          This will mark the room as out of service until resolved
        </p>

        <form onSubmit={handleReport}>
          <label>What's wrong?</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. AC not working, broken lamp"
          />

          {error && <p className="login-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Reporting...' : 'Report issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ReportIssueModal