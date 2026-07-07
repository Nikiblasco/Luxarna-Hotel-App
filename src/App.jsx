import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import RoomCard from './components/RoomCard'
import CleaningChecklistModal from './components/CleaningChecklistModal'
import Login from './components/Login'
import BookingModal from './components/BookingModal'
import CheckoutModal from './components/CheckoutModal'
import ReportIssueModal from './components/ReportIssueModal'
import ResolveIssueModal from './components/ResolveIssueModal'
import ActivityLog from './components/ActivityLog'
import TaskList from './components/TaskList'
import Leaderboard from './components/Leaderboard'
import DailyTasks from './components/DailyTasks'
import Notifications from './components/Notifications'
import { useNotificationCount } from './hooks/useNotificationCount'
import {
  canBookRoom,
  canResolveIssue,
  canViewActivityLog,
  canHandleBarRestaurant,
  canHandleLaundry,
} from './permissions'
import './App.css'

function App() {
  const [currentStaff, setCurrentStaff] = useState(null)
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [showChecklist, setShowChecklist] = useState(false)
  const [showBooking, setShowBooking] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showReportIssue, setShowReportIssue] = useState(false)
  const [showResolveIssue, setShowResolveIssue] = useState(false)
  const [showActivityLog, setShowActivityLog] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showDailyTasks, setShowDailyTasks] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [activeTaskType, setActiveTaskType] = useState(null)
  const [taskCounts, setTaskCounts] = useState({ bar: 0, restaurant: 0, laundry: 0 })

  const { count: notifCount, refresh: refreshNotifCount } = useNotificationCount(
    currentStaff?.id
  )

  useEffect(() => {
    const saved = sessionStorage.getItem('currentStaff')
    if (saved) setCurrentStaff(JSON.parse(saved))
  }, [])

  useEffect(() => {
    if (currentStaff) {
      fetchRooms()
      fetchTaskCounts()
    }
  }, [currentStaff])

  async function fetchRooms() {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('room_number')
    if (error) console.error('Error fetching rooms:', error)
    else setRooms(data)
    setLoading(false)
  }

  async function fetchTaskCounts() {
    const types = ['bar', 'restaurant', 'laundry']
    const counts = {}
    for (const type of types) {
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('type', type)
        .in('status', ['pending', 'in_progress'])
      counts[type] = error ? 0 : count
    }
    setTaskCounts(counts)
  }

  function handleLogin(staff) {
    setCurrentStaff(staff)
    sessionStorage.setItem('currentStaff', JSON.stringify(staff))
  }

  function handleLogout() {
    setCurrentStaff(null)
    sessionStorage.removeItem('currentStaff')
  }

  function handleRoomClick(room) {
    setSelectedRoom(room)
    if (room.status === 'needs_cleaning') {
      setShowChecklist(true)
    } else if (room.status === 'clean') {
      if (canBookRoom(currentStaff)) setShowBooking(true)
      else alert('Only receptionists or the manager can book a room.')
    } else if (room.status === 'occupied') {
      if (canBookRoom(currentStaff)) setShowCheckout(true)
      else alert('Only receptionists or the manager can check out a room.')
    } else if (room.status === 'out_of_service') {
      if (canResolveIssue(currentStaff)) setShowResolveIssue(true)
      else alert('Only the manager can resolve this issue.')
    }
  }

  function handleReportIssueClick(room) {
    setSelectedRoom(room)
    setShowReportIssue(true)
  }

  function handleChecklistClose() { setShowChecklist(false); setSelectedRoom(null) }
  function handleChecklistComplete() { setShowChecklist(false); setSelectedRoom(null); fetchRooms() }
  function handleBookingClose() { setShowBooking(false); setSelectedRoom(null) }
  function handleBookingComplete() { setShowBooking(false); setSelectedRoom(null); fetchRooms() }
  function handleCheckoutClose() { setShowCheckout(false); setSelectedRoom(null) }
  function handleCheckoutComplete() { setShowCheckout(false); setSelectedRoom(null); fetchRooms() }
  function handleReportIssueClose() { setShowReportIssue(false); setSelectedRoom(null) }
  function handleReportIssueComplete() { setShowReportIssue(false); setSelectedRoom(null); fetchRooms() }
  function handleResolveIssueClose() { setShowResolveIssue(false); setSelectedRoom(null) }
  function handleResolveIssueComplete() { setShowResolveIssue(false); setSelectedRoom(null); fetchRooms() }

  if (!currentStaff) return <Login onLogin={handleLogin} />

  if (showActivityLog) return <ActivityLog onClose={() => setShowActivityLog(false)} />
  if (showLeaderboard) return <Leaderboard onClose={() => setShowLeaderboard(false)} />
  if (showDailyTasks) return <DailyTasks currentStaff={currentStaff} onClose={() => setShowDailyTasks(false)} />
  if (showNotifications) return (
    <Notifications
      currentStaff={currentStaff}
      onClose={() => { setShowNotifications(false); refreshNotifCount() }}
    />
  )

  if (activeTaskType) {
    const canHandle = activeTaskType === 'laundry' ? canHandleLaundry : canHandleBarRestaurant
    return (
      <TaskList
        type={activeTaskType}
        currentStaff={currentStaff}
        canHandle={canHandle}
        onClose={() => { setActiveTaskType(null); fetchTaskCounts() }}
      />
    )
  }

  return (
    <div className="app-shell">
      <div className="app-header">
        <h1>Rooms</h1>
        <div className="staff-badge">
          <span>{currentStaff.name}</span>

          {/* Notification bell — visible to all staff */}
          <button
            className="notif-bell"
            onClick={() => setShowNotifications(true)}
          >
            🔔
            {notifCount > 0 && (
              <span className="notif-badge">{notifCount}</span>
            )}
          </button>

          {/* Manager-only buttons */}
          {canViewActivityLog(currentStaff) && (
            <>
              <button onClick={() => setShowDailyTasks(true)}>Daily tasks</button>
              <button onClick={() => setShowLeaderboard(true)}>Leaderboard</button>
              <button onClick={() => setShowActivityLog(true)}>Activity log</button>
            </>
          )}

          <button onClick={handleLogout}>Log out</button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#999' }}>Loading rooms...</p>
      ) : (
        <div className="room-grid">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onClick={handleRoomClick}
              onReportIssue={handleReportIssueClick}
            />
          ))}
        </div>
      )}

      <p className="dept-section-label">Your departments</p>
      <div className="dept-list">
        <button className="dept-card dept-restaurant" onClick={() => setActiveTaskType('restaurant')}>
          <span className="dept-icon">🍽</span>
          <span className="dept-info">
            <span className="dept-name">Restaurant</span>
            <span className="dept-count">
              {taskCounts.restaurant === 0 ? 'No pending orders' : `${taskCounts.restaurant} pending`}
            </span>
          </span>
        </button>

        <button className="dept-card dept-bar" onClick={() => setActiveTaskType('bar')}>
          <span className="dept-icon">🍸</span>
          <span className="dept-info">
            <span className="dept-name">Bar</span>
            <span className="dept-count">
              {taskCounts.bar === 0 ? 'No pending orders' : `${taskCounts.bar} pending`}
            </span>
          </span>
        </button>

        <button className="dept-card dept-laundry" onClick={() => setActiveTaskType('laundry')}>
          <span className="dept-icon">🧺</span>
          <span className="dept-info">
            <span className="dept-name">Laundry</span>
            <span className="dept-count">
              {taskCounts.laundry === 0 ? 'No pending orders' : `${taskCounts.laundry} pending`}
            </span>
          </span>
        </button>
      </div>

      {showChecklist && selectedRoom && (
        <CleaningChecklistModal room={selectedRoom} currentStaff={currentStaff} onClose={handleChecklistClose} onComplete={handleChecklistComplete} />
      )}
      {showBooking && selectedRoom && (
        <BookingModal room={selectedRoom} currentStaff={currentStaff} onClose={handleBookingClose} onComplete={handleBookingComplete} />
      )}
      {showCheckout && selectedRoom && (
        <CheckoutModal room={selectedRoom} currentStaff={currentStaff} onClose={handleCheckoutClose} onComplete={handleCheckoutComplete} />
      )}
      {showReportIssue && selectedRoom && (
        <ReportIssueModal room={selectedRoom} currentStaff={currentStaff} onClose={handleReportIssueClose} onComplete={handleReportIssueComplete} />
      )}
      {showResolveIssue && selectedRoom && (
        <ResolveIssueModal room={selectedRoom} currentStaff={currentStaff} onClose={handleResolveIssueClose} onComplete={handleResolveIssueComplete} />
      )}
    </div>
  )
}

export default App