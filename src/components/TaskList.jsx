import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import TaskCard from './TaskCard'
import { toast } from 'react-hot-toast' // Import the beautiful toast notifier

const TYPE_LABELS = {
  bar: 'Bar',
  restaurant: 'Restaurant',
  laundry: 'Laundry',
}

function TaskList({ type, currentStaff, canHandle, onClose }) {
  const [tasks, setTasks] = useState([])
  const [rooms, setRooms] = useState([])
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewTask, setShowNewTask] = useState(false)
  const [newDescription, setNewDescription] = useState('')
  const [newRoomId, setNewRoomId] = useState('')
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTasks()
    fetchRooms()
    fetchRelevantStaff()
  }, [])

  async function fetchTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, rooms(room_number), staff(name)')
      .eq('type', type)
      .neq('status', 'done')
      .order('created_at', { ascending: false })

    if (!error) setTasks(data || [])
    setLoading(false)
  }

  async function fetchRooms() {
    const { data, error } = await supabase.from('rooms').select('id, room_number').order('room_number')
    if (!error) setRooms(data || [])
  }

  async function fetchRelevantStaff() {
    let targetRole = 'cook'
    if (type === 'laundry') targetRole = 'housekeeper'
    if (type === 'bar') targetRole = 'bartender'

    const { data, error } = await supabase
      .from('staff')
      .select('id, name, role')

    if (!error && data) {
      const filtered = data.filter(s => s.role?.toLowerCase() === targetRole)
      setStaffList(filtered)
    }
  }

  async function handleCreateTask(e) {
    e.preventDefault()
    if (!newDescription.trim()) return
    setSaving(true)

    const { error } = await supabase.from('tasks').insert({
      type,
      room_id: newRoomId || null,
      description: newDescription.trim(),
      status: 'pending',
      assigned_to: selectedStaffId || null,
    })

    if (!error) {
      toast.success('Task logged successfully!')
      setNewDescription('')
      setNewRoomId('')
      setSelectedStaffId('')
      setShowNewTask(false)
      fetchTasks()
    } else {
      toast.error('Failed to create task.')
    }
    setSaving(false)
  }

  async function handleTaskClick(task) {
    if (task.status === 'done') return

    const cleanRole = currentStaff?.role?.toLowerCase()?.trim()
    const isReceptionistOrManager = cleanRole === 'manager' || cleanRole === 'receptionist' || cleanRole === 'frontdesk' || cleanRole === 'rod'

    let nextStatus
    let updates = {}

    // STEP 1: Staff moves task to seen
    if (task.status === 'pending') {
      const isAllowedCook = type === 'restaurant' && cleanRole === 'cook'
      const isAllowedHousekeeper = type === 'laundry' && cleanRole === 'housekeeper'
      const isAllowedBartender = type === 'bar' && cleanRole === 'bartender'

      if (!isAllowedCook && !isAllowedHousekeeper && !isAllowedBartender && !isReceptionistOrManager) {
        toast.error(`Access Denied: Open to ${TYPE_LABELS[type]} staff only.`)
        return
      }
      
      nextStatus = 'seen'
      updates = { status: nextStatus }
      if (!task.assigned_to) {
        updates.assigned_to = currentStaff.id
      }
    } 
    
    // STEP 2: Complete the task
    else if (task.status === 'seen') {
      if (!isReceptionistOrManager) {
        toast.error(`Only Receptionists or Managers can finalize this task.`)
        return
      }
      nextStatus = 'done'
      updates = { status: nextStatus, completed_at: new Date().toISOString() }
    } else {
      return
    }

    const { error } = await supabase.from('tasks').update(updates).eq('id', task.id)

    if (error) {
      toast.error('Database sync failed.')
      return
    }

    const actionWord = nextStatus === 'seen' ? 'Opened & Seen' : 'Cleared/Completed'
    await supabase.from('activity_log').insert({
      staff_id: currentStaff.id,
      action: `${actionWord} ${TYPE_LABELS[type].toLowerCase()} task: ${task.description}`,
    })

    if (nextStatus === 'done') {
      toast.success('Task closed out!')
    } else {
      toast('Task marked as seen', { icon: '👀' })
    }

    fetchTasks()
  }

  return (
    <div className="activity-log-screen">
      <div className="app-header">
        <h1>{TYPE_LABELS[type]}</h1>
        <div className="staff-badge">
          <button onClick={() => setShowNewTask(true)}>+ New</button>
          <button className="btn-secondary" onClick={onClose}>Back</button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#999' }}>Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p style={{ color: '#999' }}>No {TYPE_LABELS[type].toLowerCase()} tasks yet.</p>
      ) : (
        <div className="log-list">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={handleTaskClick} />
          ))}
        </div>
      )}

      {showNewTask && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>New {TYPE_LABELS[type].toLowerCase()} task</h2>
            <form onSubmit={handleCreateTask}>
              <label>Room (optional)</label>
              <select
                value={newRoomId}
                onChange={(e) => setNewRoomId(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#0d0d0d', color: '#fff', marginBottom: '16px' }}
              >
                <option value="">No specific room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>Room {room.room_number}</option>
                ))}
              </select>

              <label>Assign to Specific Worker (optional)</label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#0d0d0d', color: '#fff', marginBottom: '16px' }}
              >
                <option value="">Leave unassigned (Any available worker)</option>
                {staffList.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>

              <label>Description</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder={type === 'laundry' ? 'e.g. 3 shirts' : 'e.g. Rice and Chicken'}
              />

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowNewTask(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Adding...' : 'Add task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskList