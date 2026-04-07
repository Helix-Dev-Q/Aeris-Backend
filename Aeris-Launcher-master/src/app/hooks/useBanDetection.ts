'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface BanInfo {
  banned: boolean
  reason?: string
  expiresAt?: string
  remainingTime?: number
  type?: 'temporary' | 'permanent'
}

export function useBanDetection(accountId: string | null) {
  const [banInfo, setBanInfo] = useState<BanInfo>({ banned: false })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const checkBanStatus = useCallback(async () => {
    if (!accountId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/detect/check/${accountId}`)
      if (response.ok) {
        const data = await response.json()
        setBanInfo(data)
        
        if (data.banned) {
          // Store ban info in localStorage for persistence
          localStorage.setItem('banInfo', JSON.stringify(data))
          localStorage.setItem('bannedAt', Date.now().toString())
          
          // Redirect to banned page or show modal
          router.push('/banned')
        }
      }
    } catch (error) {
      console.error('Error checking ban status:', error)
    } finally {
      setIsLoading(false)
    }
  }, [accountId, router])

  useEffect(() => {
    // Check ban status on mount and periodically
    checkBanStatus()
    
    if (accountId) {
      const interval = setInterval(checkBanStatus, 30000) // Check every 30 seconds
      return () => clearInterval(interval)
    }
  }, [checkBanStatus, accountId])

  const reportDllInjection = useCallback(async (processName?: string, injectedDlls?: string[]) => {
    if (!accountId) return false

    try {
      const response = await fetch('/api/detect/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          username: localStorage.getItem('username') || 'Unknown',
          processName: processName || 'FortniteClient-Win64-Shipping.exe',
          injectedDlls: injectedDlls || []
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('DLL injection reported:', data)
        
        // Immediately check ban status after reporting
        await checkBanStatus()
        
        // Store detection info
        localStorage.setItem('lastDetection', JSON.stringify({
          timestamp: Date.now(),
          processName,
          injectedDlls
        }))
        
        return true
      }
    } catch (error) {
      console.error('Error reporting DLL injection:', error)
    }
    
    return false
  }, [accountId, checkBanStatus])

  const simulateDetection = useCallback(async () => {
    if (!accountId) return false

    try {
      const response = await fetch('/api/detect/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Detection simulated:', data)
        
        // Check ban status after simulation
        await checkBanStatus()
        
        return true
      }
    } catch (error) {
      console.error('Error simulating detection:', error)
    }
    
    return false
  }, [accountId, checkBanStatus])

  return {
    banInfo,
    isLoading,
    checkBanStatus,
    reportDllInjection,
    simulateDetection
  }
}
