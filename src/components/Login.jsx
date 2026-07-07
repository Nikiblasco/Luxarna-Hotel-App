import { useState } from 'react'
import { supabase } from '../supabaseClient'

function Login({ onLogin }) {
  const [staffList, setStaffList] = useState([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useState(() => {
    fetchStaff()
  }, [])

  async function fetchStaff() {
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, role')
      .order('name')

    if (!error) setStaffList(data)
    setLoading(false)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')

    if (!selectedStaffId) {
      setError('Please select your name')
      return
    }

    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('id', selectedStaffId)
      .eq('pin', pin)
      .single()

    if (error || !data) {
      setError('Incorrect PIN')
      return
    }

    onLogin(data)
  }

  return (
    <div className="in-shell">
      <div className="login-card">
        <h1>Luxarna Hotel & Spa</h1>

        {loading ? (
          <p>Loading staff list...</p>
        ) : (
          <form onSubmit={handleLogin}>
            <label>Who are you?</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
            >
              <option value="">Select your name</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.role})
                </option>
              ))}
            </select>

            <label>PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength="4"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="4-digit PIN"
            />

            {error && <p className="login-error">{error}</p>}

            <button type="submit">Log in</button>
          </form>
        )}
      </div>
    </div>
  )
}

export default Login