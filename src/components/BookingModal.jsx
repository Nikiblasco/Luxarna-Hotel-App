import { useState } from 'react'
import { supabase } from '../supabaseClient'

function BookingModal({ room, currentStaff, onClose, onComplete }) {
  const [guestName, setGuestName] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleBook(e) {
    e.preventDefault()
    setError('')

    if (!guestName.trim()) {
      setError('Guest name is required')
      return
    }

    setSaving(true)

    // 1. Update the room itself
    const { error: roomError } = await supabase
      .from('rooms')
      .update({
        status: 'occupied',
        notes: `Guest: ${guestName.trim()}${checkOutDate ? ' · Checkout: ' + checkOutDate : ''}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', room.id)

    if (roomError) {
      console.error('Error booking room:', roomError)
      setError('Could not save booking. Try again.')
      setSaving(false)
      return
    }

    // 2. Log this action so we know who booked it and when
    const { error: logError } = await supabase
      .from('activity_log')
      .insert({
        staff_id: currentStaff.id,
        action: `Booked room ${room.room_number} for ${guestName.trim()}`,
      })

    if (logError) {
      console.error('Error writing activity log:', logError)
      // Don't block the booking over a logging failure — just note it
    }

    setSaving(false)
    onComplete()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2>Book Room {room.room_number}</h2>
        <p className="modal-subtitle">Enter guest details to mark this room occupied</p>

        <form onSubmit={handleBook}>
          <label>Guest name</label>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="e.g. John Okafor"
          />

          <label>Expected check-out date (optional)</label>
          <input
            type="date"
            value={checkOutDate}
            onChange={(e) => setCheckOutDate(e.target.value)}
          />

          {error && <p className="login-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Booking...' : 'Confirm booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BookingModal