import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function Leaderboard({ onClose }) {
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRankings()
  }, [])

  async function fetchRankings() {
    // Pull every activity log row with the staff name attached
    const { data, error } = await supabase
      .from('activity_log')
      .select('staff_id, staff(name, role)')

    if (error) {
      console.error('Error fetching leaderboard data:', error)
      setLoading(false)
      return
    }

    // Count actions per staff member
    const counts = {}
    data.forEach((row) => {
      const id = row.staff_id
      if (!id || !row.staff) return
      if (!counts[id]) {
        counts[id] = { name: row.staff.name, role: row.staff.role, total: 0 }
      }
      counts[id].total += 1
    })

    const sorted = Object.values(counts).sort((a, b) => b.total - a.total)
    setRankings(sorted)
    setLoading(false)
  }

  const maxTotal = rankings.length > 0 ? rankings[0].total : 1

  return (
    <div className="leaderboard-screen">
      <div className="app-header">
        <h1>Staff leaderboard</h1>
        <button className="btn-secondary" onClick={onClose}>
          Back
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#999' }}>Crunching the numbers...</p>
      ) : rankings.length === 0 ? (
        <p style={{ color: '#999' }}>No activity recorded yet.</p>
      ) : (
        <div className="lb-list">
          {rankings.map((person, index) => (
            <div key={person.name} className={`lb-row lb-rank-${index < 3 ? index + 1 : 'other'}`}>
              <div className="lb-rank-badge">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
              </div>
              <div className="lb-info">
                <p className="lb-name">{person.name}</p>
                <p className="lb-role">{person.role}</p>
                <div className="lb-bar-track">
                  <div
                    className="lb-bar-fill"
                    style={{ width: `${(person.total / maxTotal) * 100}%` }}
                  />
                </div>
              </div>
              <div className="lb-total">
                <span className="lb-total-number">{person.total}</span>
                <span className="lb-total-label">actions</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Leaderboard