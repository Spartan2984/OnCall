/**
 * Hook for managing ElevenLabs conversation with transcript streaming
 * 
 * Uses the ElevenLabs React SDK to:
 * - Fetch signed URL from our backend
 * - Connect to ElevenLabs WebSocket
 * - Stream real-time transcripts
 * - Handle connection state
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useConversation } from '@elevenlabs/react'
import type { TranscriptEvent, ConnectionStatus } from '../types'
import { fetchSignedUrl } from '../lib/api'
import { VOICE_QUOTA_ERROR_MARKER } from '../lib/voiceQuotaMarker'

function formatVoiceSessionError(raw: string): string {
  const q = raw.toLowerCase()
  if (
    q.includes('quota') ||
    q.includes('resource exhausted') ||
    q.includes('exceeded your') ||
    q.includes('429')
  ) {
    return `${VOICE_QUOTA_ERROR_MARKER}: ${raw}`
  }
  return raw
}

interface UseConversationTranscriptionOptions {
  onTranscriptUpdate?: (events: TranscriptEvent[]) => void
  onFinalTranscript?: (text: string) => void
}

export function useConversationTranscription(options: UseConversationTranscriptionOptions = {}) {
  const [transcriptEvents, setTranscriptEvents] = useState<TranscriptEvent[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const eventIdCounter = useRef(0)

  const conversation = useConversation({
    onConnect: () => {
      console.log('[ElevenLabs] Connected')
      setConnectionStatus('connected')
      setError(null)
    },
    onDisconnect: (details) => {
      console.log('[ElevenLabs] Disconnected', details)
      setConnectionStatus('disconnected')
      if (details.reason === 'user') {
        setError(null)
        return
      }
      if (details.reason === 'agent') {
        setError(
          'The agent ended the session (often the End call system tool). In ElevenLabs → your agent → Tools, tighten the End call prompt or remove that tool so it does not hang up right after the greeting.'
        )
        return
      }
      if (details.reason === 'error') {
        setError(formatVoiceSessionError(details.message))
      }
    },
    onError: (message) => {
      console.error('[ElevenLabs] Error:', message)
      setError(formatVoiceSessionError(message))
      setConnectionStatus('error')
    },
    onModeChange: ({ mode }) => {
      // mode is 'speaking' | 'listening'
      setIsSpeaking(mode === 'speaking')
    },
    onMessage: ({ message, role, source }) => {
      // Handle transcript messages from ElevenLabs ConvAI
      // MessagePayload has: message (string), role ("user" | "agent")
      console.log('[ElevenLabs] Message:', { message, role })

      const transcriptRole: TranscriptEvent['type'] =
        role === 'user' || role === 'agent' ? role : source === 'user' ? 'user' : 'agent'

      const newEvent: TranscriptEvent = {
        id: `${transcriptRole}-${++eventIdCounter.current}`,
        type: transcriptRole,
        text: message,
        isFinal: true,
        timestamp: Date.now(),
      }

      setTranscriptEvents((prev) => {
        const updated = [...prev, newEvent]
        options.onTranscriptUpdate?.(updated)
        return updated
      })

      // Only real user speech should trigger backend Gemini intent/mockup (avoid mislabeled agent lines).
      if (role === 'user') {
        options.onFinalTranscript?.(message)
      }
    },
  })

  const conversationRef = useRef(conversation)
  conversationRef.current = conversation

  // Keeps the session alive when the user is quiet (some agent configs treat silence as idle).
  useEffect(() => {
    if (connectionStatus !== 'connected') return
    const id = window.setInterval(() => {
      conversationRef.current.sendUserActivity()
    }, 25_000)
    return () => window.clearInterval(id)
  }, [connectionStatus])

  const startSession = useCallback(async () => {
    try {
      setConnectionStatus('connecting')
      setError(null)

      // Fetch signed URL from our backend
      const signedUrl = await fetchSignedUrl()
      
      // Start the conversation session
      await conversation.startSession({
        signedUrl,
        useWakeLock: true,
      })
    } catch (err) {
      console.error('Failed to start session:', err)
      
      // Provide user-friendly error messages for common microphone errors
      let errorMessage = 'Failed to start session'
      if (err instanceof DOMException) {
        if (err.name === 'NotFoundError' || err.message.includes('device not found')) {
          errorMessage = 'Microphone not found. Please check your microphone is connected and try again. You may need to reset microphone permissions in your browser settings.'
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Microphone permission denied. Please allow microphone access and try again.'
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = 'Microphone is in use by another application. Please close other apps using the microphone and try again.'
        } else {
          errorMessage = `Microphone error: ${err.message}`
        }
      } else if (err instanceof Error) {
        errorMessage = formatVoiceSessionError(err.message)
      }
      
      setError(errorMessage)
      setConnectionStatus('error')
    }
  }, [conversation])

  const endSession = useCallback(async () => {
    try {
      await conversation.endSession()
      setTranscriptEvents([])
    } catch (err) {
      console.error('Failed to end session:', err)
    }
  }, [conversation])

  return {
    // State
    transcriptEvents,
    connectionStatus,
    isSpeaking,
    error,
    
    // Actions
    startSession,
    endSession,
    
    // Raw conversation object for advanced usage
    conversation,
  }
}
