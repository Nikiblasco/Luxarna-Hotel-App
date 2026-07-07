import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function CleaningChecklistModal({ room, currentStaff, onClose, onComplete }) {
  const [items, setItems] = useState([])
  const [checked, setChecked] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchChecklistItems()
  }, [])

  async function fetchChecklistItems() {
    const { data, error } = await supabase
      .from('checklist_template')
      .select('*')
      .order('sort_order')

    if (error) {
      console.error('Error fetching checklist:', error)
    } else {
      setItems(data)
    }
    setLoading(false)
  }

  function toggleItem(itemId) {
    setChecked((prev) => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  const allChecked = items.length > 0 && items.every((item) => checked[item.id])

  async function handleComplete() {
    setSaving(true)

    const { data: cleaning, error: cleaningError } = await supabase
      .from('room_cleanings')
      .insert({
        room_id: room.id,
        cleaned_by: currentStaff?.id || null,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (cleaningError) {
      console.error('Error creating cleaning record:', cleaningError)
      setSaving(false)
      return
    }

    const itemRows = items.map((item) => ({
      cleaning_id: cleaning.id,
      checklist_item_id: item.id,
      checked: !!checked[item.id],
    }))

    const { error: itemsError } = await supabase
      .from('room_cleaning_items')
      .insert(itemRows)

    if (itemsError) {
      console.error('Error saving checklist items:', itemsError)
      setSaving(false)
      return
    }

   const { error: roomError } = await supabase
      .from('rooms')
      .update({ status: 'clean', updated_at: new Date().toISOString() })
      .eq('id', room.id)

    if (roomError) {
      console.error('Error updating room status:', roomError)
      setSaving(false)
      return
    }

    const { error: logError } = await supabase
      .from('activity_log')
      .insert({
        staff_id: currentStaff?.id || null,
        action: `Cleaned room ${room.room_number}`,
      })

    if (logError) {
      console.error('Error writing activity log:', logError)
      // Don't block completion over a logging failure
    }

    setSaving(false)
    onComplete()
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '380px',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <h2 style={{ margin: '0 0 4px', fontSize: '18px', color: '#fff' }}>
          Room {room.room_number} — cleaning checklist
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#999' }}>
          Check off each item before marking this room clean
        </p>

        {loading ? (
          <p style={{ color: '#999' }}>Loading checklist...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {items.map((item) => (
              <label
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '14px',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={!!checked[item.id]}
                  onChange={() => toggleItem(item.id)}
                  style={{ width: '18px', height: '18px' }}
                />
                {item.item}
              </label>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #444',
              backgroundColor: 'transparent',
              color: '#ccc',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleComplete}
            disabled={!allChecked || saving}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: allChecked ? '#3b6d11' : '#333',
              color: allChecked ? '#fff' : '#777',
              cursor: allChecked ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Saving...' : 'Mark room clean'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CleaningChecklistModal 