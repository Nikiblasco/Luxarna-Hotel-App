import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useNotificationCount(currentStaff) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!currentStaff?.id) return
    fetchCount()

    // OPTIMIZATION: Set up a realtime listener so badge counts update instantly!
    const channel = supabase
      .channel('live-notification-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_tasks' }, () => fetchCount())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_task_assignments' }, () => fetchCount())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentStaff])

  async function fetchCount() {
    if (currentStaff.role === 'manager') {
      // Managers get notified about any task pending their approval
      const { count: managerCount, error } = await supabase
        .from('daily_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_review')
        .eq('date', new Date().toISOString().split('T')[0])

      if (!error) setCount(managerCount || 0)
    } else {
      // Regular staff get notified about unseen new assignments
      const { count: staffCount, error } = await supabase
        .from('daily_task_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', currentStaff.id)
        .eq('seen', false)

      if (!error) setCount(staffCount || 0)
    }
  }

  return { count, refresh: fetchCount }
}