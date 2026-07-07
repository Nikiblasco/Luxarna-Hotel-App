function TaskCard({ task, onClick }) {
  const statusStyles = {
    pending: { bg: '#3a2f12', border: '#854f0b', text: '#fac775' },
    in_progress: { bg: '#1a2a3a', border: '#185fa5', text: '#85b7eb' },
    done: { bg: '#1d3a2a', border: '#3b6d11', text: '#97c459' },
  }

  const statusLabels = {
    pending: 'Pending',
    in_progress: 'In progress',
    done: 'Done',
  }

  const style = statusStyles[task.status] || statusStyles.pending

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div
      onClick={() => onClick(task)}
      style={{
        backgroundColor: '#1a1a1a',
        border: `1px solid ${style.border}`,
        borderRadius: '10px',
        padding: '12px 14px',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#fff' }}>
          {task.rooms ? `Room ${task.rooms.room_number} — ` : ''}
          {task.description}
        </p>
        <span
          style={{
            backgroundColor: style.bg,
            color: style.text,
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
            marginLeft: '8px',
          }}
        >
          {statusLabels[task.status] || task.status}
        </span>
      </div>
      <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#888' }}>
        {task.staff ? `Assigned to ${task.staff.name}` : 'Unassigned'} · {formatTime(task.created_at)}
      </p>
    </div>
  )
}

export default TaskCard