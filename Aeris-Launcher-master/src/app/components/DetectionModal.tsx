'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface DetectionModalProps {
  isOpen: boolean
  username: string
  onClose: () => void
}

export default function DetectionModal({ isOpen, username, onClose }: DetectionModalProps) {
  const router = useRouter()
  const [timeRemaining, setTimeRemaining] = useState(3600) // 1 hour in seconds

  useEffect(() => {
    if (!isOpen) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleLogout = () => {
    // Clear local storage and session
    localStorage.clear()
    sessionStorage.clear()
    
    // Redirect to login page
    router.push('/auth/login')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-red-900 to-orange-900 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 border-2 border-red-500">
        <div className="text-center">
          {/* Warning Icon */}
          <div className="mx-auto mb-4 w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white mb-4">Security Alert</h2>
          
          <div className="bg-red-800 bg-opacity-50 p-4 rounded-lg mb-4">
            <p className="text-white text-sm leading-relaxed">
              Hello, <span className="font-bold text-yellow-300">{username}</span>
            </p>
            <p className="text-white text-sm leading-relaxed mt-2">
              We've detected a DLL injected into the Fortnite process and we'll assume that it's a cheat.
            </p>
            <p className="text-white text-sm leading-relaxed mt-2">
              Just in case it is, we're going to disable your Fortnite privileges temporarily for an hour.
            </p>
            <p className="text-white text-sm leading-relaxed mt-2 font-bold text-yellow-300">
              Please don't do this again or we'll have to ban you.
            </p>
          </div>

          {/* Timer Display */}
          <div className="bg-black bg-opacity-50 p-3 rounded-lg mb-4">
            <p className="text-yellow-300 text-sm font-semibold mb-1">Time Remaining:</p>
            <p className="text-white text-xl font-mono font-bold">{formatTime(timeRemaining)}</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout Now
            </button>
            
            <button
              onClick={() => window.close()}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
            >
              Close Launcher
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-300">
            <p>This is an automatic security measure.</p>
            <p>If you believe this is a mistake, please contact support.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
