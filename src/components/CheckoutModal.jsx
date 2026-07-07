import { useState } from 'react'
import { supabase } from '../supabaseClient'

function CheckoutModal({ room, currentStaff, onClose, onComplete }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCheckout() {
    setError('')
    setSaving(true)

    const { error: roomError } = await supabase
      .from('rooms')
      .update({
        status: 'needs_cleaning',
        notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', room.id)

    if (roomError) {
      console.error('Error checking out room:', roomError)
      setError('Could not check out. Try again.')
      setSaving(false)
      return
    }

    const { error: logError } = await supabase
      .from('activity_log')
      .insert({
        staff_id: currentStaff.id,
        action: `Checked out room ${room.room_number}`,
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
        <h2>Check out Room {room.room_number}</h2>
        <p className="modal-subtitle">
          {room.notes ? room.notes : 'No guest details on file'}
        </p>

        {error && <p className="login-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleCheckout}
            disabled={saving}
          >
            {saving ? 'Checking out...' : 'Confirm check-out'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CheckoutModal