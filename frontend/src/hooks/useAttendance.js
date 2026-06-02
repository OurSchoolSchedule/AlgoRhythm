import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getTodayAttendance, checkIn, checkOut } from '@/api'
import { queryKeys } from './queryKeys.js'

export function useTodayAttendance(options = {}) {
  return useQuery({
    queryKey: queryKeys.attendance.today(),
    queryFn: getTodayAttendance,
    ...options,
  })
}

export function useCheckIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: checkIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.today() })
    },
  })
}

export function useCheckOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: checkOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.today() })
    },
  })
}
