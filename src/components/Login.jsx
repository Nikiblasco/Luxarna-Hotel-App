import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function Login({ onLogin }) {
  const [staffList, setStaffList] = useState([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef(null)

  useEffect(() => {
    fetchStaff()
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId)

  return (
    <div className="in-shell">
      <div className="login-card">
        <h1>Luxarna Hotel & Spa</h1>

        {loading ? (
          <p>Loading staff list...</p>
        ) : (
          <form onSubmit={handleLogin}>
            <label>Who are you?</label>

            <div className="staff-picker" ref={pickerRef}>
              <button
                type="button"
                className={`staff-picker-trigger ${pickerOpen ? 'open' : ''}`}
                onClick={() => setPickerOpen(!pickerOpen)}
              >
                {selectedStaff ? (
                  <span>{selectedStaff.name} ({selectedStaff.role})</span>
                ) : (
                  <span className="staff-picker-placeholder">Select your name</span>
                )}
                <span className={`staff-picker-arrow ${pickerOpen ? 'open' : ''}`}>▾</span>
              </button>

              {pickerOpen && (
                <ul className="staff-picker-list">
                  {staffList.map((staff) => (
                    <li
                      key={staff.id}
                      className={`staff-picker-option ${
                        staff.id === selectedStaffId ? 'selected' : ''
                      }`}
                      onClick={() => {
                        setSelectedStaffId(staff.id)
                        setPickerOpen(false)
                      }}
                    >
                      <span className="staff-picker-initial">
                        {staff.name.charAt(0)}
                      </span>
                      <span className="staff-picker-text">
                        <span className="staff-picker-name">{staff.name}</span>
                        <span className="staff-picker-role">{staff.role}</span>
                      </span>
                      <span className="staff-picker-check">✓</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

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