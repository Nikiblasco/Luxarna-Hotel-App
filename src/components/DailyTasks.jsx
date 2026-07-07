import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function DailyTasks({ currentStaff, onClose }) {
  const [tasks, setTasks] = useState([])
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewTask, setShowNewTask] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedStaff, setSelectedStaff] = useState([])
  const [saving, setSaving] = useState(false)

  const isManager = currentStaff?.role === 'manager'

  useEffect(() => {
    fetchTasks()
    fetchStaff()
  }, [])

  async function fetchTasks() {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('daily_tasks')
      .select(`
        *,
        staff(name),
        daily_task_assignments(
          id,
          seen,
          staff(name)
        )
      `)
      .eq('date', today)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching daily tasks:', error)
    } else {
      setTasks(data)
    }
    setLoading(false)
  }

  async function fetchStaff() {
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, role')
      .order('name')
    if (!error) setStaffList(data)
  }

  function toggleStaffSelection(staffId) {
    setSelectedStaff((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId]
    )
  }

  async function handleCreateTask(e) {
    e.preventDefault()
    if (!title.trim() || selectedStaff.length === 0) return
    setSaving(true)

    const { data: task, error: taskError } = await supabase
      .from('daily_tasks')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        created_by: currentStaff.id,
        date: new Date().toISOString().split('T')[0],
        status: 'active' // Explicitly default new tasks to active
      })
      .select()
      .single()

    if (taskError) {
      console.error('Error creating daily task:', taskError)
      setSaving(false)
      return
    }

    const assignments = selectedStaff.map((staffId) => ({
      task_id: task.id,
      staff_id: staffId,
      seen: false,
    }))

    const { error: assignError } = await supabase
      .from('daily_task_assignments')
      .insert(assignments)

    if (assignError) {
      console.error('Error assigning task:', assignError)
    }

    await supabase.from('activity_log').insert({
      staff_id: currentStaff.id,
      action: `Assigned daily task: ${title.trim()}`,
    })

    setTitle('')
    setDescription('')
    setSelectedStaff([])
    setShowNewTask(false)
    setSaving(false)
    fetchTasks()
  }

  // Optimized to look up target task dynamically and handle all transitions inside one clean state update
  async function handleUpdateStatus(taskId, newStatus, logActionText) {
    const originalTask = tasks.find(t => t.id === taskId)
    if (!originalTask) return

    const { error } = await supabase
      .from('daily_tasks')
      .update({ status: newStatus })
      .eq('id', taskId)

    if (error) {
      console.error(`Error updating task to ${newStatus}:`, error)
      return
    }

    // Always log operational changes automatically to the master snapshot log
    await supabase.from('activity_log').insert({
      staff_id: currentStaff.id,
      action: `${logActionText}: "${originalTask.title}"`,
    })

    fetchTasks()
  }

  return (
    <div className="activity-log-screen">
      <div className="app-header">
        <h1>Daily tasks</h1>
        <div className="staff-badge">
          {/* Optimization Suggestion: Only managers should see the assignment action gate */}
          {isManager && (
            <button onClick={() => setShowNewTask(true)}>+ Assign task</button>
          )}
          <button className="btn-secondary" onClick={onClose}>Back</button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#999' }}>Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p style={{ color: '#999' }}>No daily tasks assigned today yet.</p>
      ) : (
        <div className="log-list" style={{ gap: '10px' }}>
          {tasks.map((task) => (
            <div key={task.id} className="dt-card">
              <div className="dt-card-header">
                <div>
                  <p className="dt-title">{task.title}</p>
                  {task.description && (
                    <p className="dt-desc">{task.description}</p>
                  )}
                </div>
                <span className={`dt-badge ${
                  task.status === 'done' 
                    ? 'dt-badge-done' 
                    : task.status === 'pending_review' 
                    ? 'dt-badge-review' 
                    : 'dt-badge-active'
                }`}>
                  {task.status === 'done' ? 'Done' : task.status === 'pending_review' ? 'Pending Review' : 'Active'}
                </span>
              </div>

              <div className="dt-assignees">
                {task.daily_task_assignments?.map((a) => (
                  <span key={a.id} className={`dt-assignee ${a.seen ? 'dt-seen' : 'dt-unseen'}`}>
                    {a.staff?.name}
                    {a.seen ? ' ✓' : ' •'}
                  </span>
                ))}
              </div>

              {/* ACTION BUTTON CONTROLS */}
              <div className="dt-actions" style={{ marginTop: '12px' }}>
                
                {/* 1. STAFF ACTION: Task is active, user is regular staff -> Send up to Manager */}
                {task.status === 'active' && !isManager && (
                  <button
                    className="dt-done-btn"
                    onClick={() => handleUpdateStatus(task.id, 'pending_review', 'Submitted daily task for review')}
                  >
                    Submit for Review
                  </button>
                )}

                {/* 2. STAFF STATE WATCH: Task is waiting for review, user is regular staff -> Show disabled notice */}
                {task.status === 'pending_review' && !isManager && (
                  <p style={{ fontSize: '13px', color: '#d4af37', fontStyle: 'italic', margin: '4px 0 0' }}>
                    Waiting for manager approval...
                  </p>
                )}

                {/* 3. MANAGER APPROVAL CONTROLS: Task is in review -> Show Approve / Reject options */}
                {task.status === 'pending_review' && isManager && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="dt-done-btn"
                      style={{ background: '#4ade80', color: '#000', fontWeight: '600' }}
                      onClick={() => handleUpdateStatus(task.id, 'done', 'Approved & completed daily task')}
                    >
                      Approve & Close
                    </button>
                    <button
                      className="dt-done-btn btn-secondary"
                      style={{ background: '#333', color: '#f09595', border: '1px solid #f09595' }}
                      onClick={() => handleUpdateStatus(task.id, 'active', 'Sent back daily task (Needs Redo)')}
                    >
                      Reject / Redo
                    </button>
                  </div>
                )}

                {/* 4. MANAGER BYPASS: Task is active, manager can bypass the pipeline entirely if they want to close it */}
                {task.status === 'active' && isManager && (
                  <button
                    className="dt-done-btn"
                    onClick={() => handleUpdateStatus(task.id, 'done', 'Directly marked daily task as complete')}
                  >
                    Force Mark Done
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewTask && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Assign daily task</h2>
            <form onSubmit={handleCreateTask}>
              <label>Task title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Deep clean room 203"
              />

              <label>Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any extra details..."
              />

              <label>Assign to</label>
              <div className="dt-staff-picker">
                {staffList
                  .filter((s) => s.id !== currentStaff.id)
                  .map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleStaffSelection(s.id)}
                      className={`dt-staff-chip ${selectedStaff.includes(s.id) ? 'dt-chip-selected' : ''}`}
                    >
                      {s.name}
                    </button>
                  ))}
              </div>

              {selectedStaff.length === 0 && (
                <p style={{ color: '#f09595', fontSize: '12px', margin: '4px 0 8px' }}>
                  Select at least one staff member
                </p>
              )}

              <div className="modal-actions" style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowNewTask(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving || !title.trim() || selectedStaff.length === 0}
                >
                  {saving ? 'Assigning...' : 'Assign task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DailyTasks