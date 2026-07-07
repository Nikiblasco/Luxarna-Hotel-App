import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import TaskCard from './TaskCard'

const TYPE_LABELS = {
  bar: 'Bar',
  restaurant: 'Restaurant',
  laundry: 'Laundry',
}

function TaskList({ type, currentStaff, canHandle, onClose }) {
  const [tasks, setTasks] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewTask, setShowNewTask] = useState(false)
  const [newDescription, setNewDescription] = useState('')
  const [newRoomId, setNewRoomId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTasks()
    fetchRooms()
  }, [])

  async function fetchTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, rooms(room_number), staff(name)')
      .eq('type', type)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tasks:', error)
    } else {
      setTasks(data)
    }
    setLoading(false)
  }

  async function fetchRooms() {
    const { data, error } = await supabase.from('rooms').select('id, room_number').order('room_number')
    if (!error) setRooms(data)
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
    })

    if (error) {
      console.error('Error creating task:', error)
    } else {
      setNewDescription('')
      setNewRoomId('')
      setShowNewTask(false)
      fetchTasks()
    }
    setSaving(false)
  }

  async function handleTaskClick(task) {
    if (!canHandle(currentStaff)) {
      alert('You are not permitted to update this task.')
      return
    }

    let nextStatus
    let updates = {}

    if (task.status === 'pending') {
      nextStatus = 'in_progress'
      updates = { status: nextStatus, assigned_to: currentStaff.id }
    } else if (task.status === 'in_progress') {
      nextStatus = 'done'
      updates = { status: nextStatus, completed_at: new Date().toISOString() }
    } else {
      return // already done, nothing to do
    }

    const { error } = await supabase.from('tasks').update(updates).eq('id', task.id)

    if (error) {
      console.error('Error updating task:', error)
      return
    }

    await supabase.from('activity_log').insert({
      staff_id: currentStaff.id,
      action: `${nextStatus === 'in_progress' ? 'Claimed' : 'Completed'} ${TYPE_LABELS[type].toLowerCase()} task: ${task.description}`,
    })

    fetchTasks()
  }

  return (
    <div className="activity-log-screen">
      <div className="app-header">
        <h1>{TYPE_LABELS[type]}</h1>
        <div className="staff-badge">
          <button onClick={() => setShowNewTask(true)}>+ New</button>
          <button className="btn-secondary" onClick={onClose}>
            Back
          </button>
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
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #333',
                  backgroundColor: '#0d0d0d',
                  color: '#fff',
                  marginBottom: '16px',
                }}
              >
                <option value="">No specific room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    Room {room.room_number}
                  </option>
                ))}
              </select>

              <label>Description</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder={
                  type === 'laundry'
                    ? 'e.g. 3 shirts, 1 trouser'
                    : 'e.g. 2 bottles of Heineken'
                }
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowNewTask(false)}
                >
                  Cancel
                </button>
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