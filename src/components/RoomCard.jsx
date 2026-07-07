function RoomCard({ room, onClick, onReportIssue }) {
  const statusStyles = {
    clean: { bg: '#1d3a2a', border: '#3b6d11', text: '#97c459' },
    occupied: { bg: '#1a2a3a', border: '#185fa5', text: '#85b7eb' },
    needs_cleaning: { bg: '#3a2f12', border: '#854f0b', text: '#fac775' },
    out_of_service: { bg: '#3a1414', border: '#a32d2d', text: '#f09595' },
  }

  const statusLabels = {
    clean: 'Clean',
    occupied: 'Occupied',
    needs_cleaning: 'Needs cleaning',
    out_of_service: 'Out of service',
  }

  const style = statusStyles[room.status] || statusStyles.clean

  function handleReportClick(e) {
    e.stopPropagation() // prevents this click from also triggering the card's main onClick
    onReportIssue(room)
  }

  return (
    <div
      onClick={() => onClick(room)}
      style={{
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: '10px',
        padding: '14px 10px',
        cursor: 'pointer',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '15px', color: '#fff' }}>
        {room.room_number}
      </p>
      <p style={{ margin: 0, fontSize: '12px', color: style.text }}>
        {statusLabels[room.status] || room.status}
      </p>

      {room.status !== 'out_of_service' && (
        <button
          onClick={handleReportClick}
          style={{
            marginTop: '8px',
            fontSize: '10px',
            padding: '3px 8px',
            borderRadius: '6px',
            border: '1px solid #555',
            backgroundColor: 'transparent',
            color: '#aaa',
            cursor: 'pointer',
          }}
        >
          Report issue
        </button>
      )}
    </div>
  )
}

export default RoomCard