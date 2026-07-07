// Central permission rules — one place to look when deciding who can do what

export function canBookRoom(staff) {
  return staff.role === 'receptionist' || staff.role === 'manager'
}

export function canResolveIssue(staff) {
  return staff.role === 'manager'
}

export function canViewActivityLog(staff) {
  return staff.role === 'manager'
}

export function canReportIssue(staff) {
  // Anyone logged in can report a fault
  return true
}
export function canHandleBarRestaurant(staff) {
  return staff.role === 'cook' || staff.role === 'bartender' || staff.role === 'manager'
}

export function canHandleLaundry(staff) {
  return staff.role === 'housekeeper' || staff.role === 'manager'
}