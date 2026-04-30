/**
 * CallPanel component
 * 
 * Controls for starting/stopping the ElevenLabs conversation session.
 * Shows connection status and speaking indicator.
 */

import { Mic, MicOff, Phone, PhoneOff, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import type { ConnectionStatus } from '../types'
import { VOICE_QUOTA_ERROR_MARKER } from '../lib/voiceQuotaMarker'

interface CallPanelProps {
  connectionStatus: ConnectionStatus
  isSpeaking: boolean
  error: string | null
  onStartCall: () => void
  onEndCall: () => void
}

export function CallPanel({
  connectionStatus,
  isSpeaking,
  error,
  onStartCall,
  onEndCall,
}: CallPanelProps) {
  const isConnected = connectionStatus === 'connected'
  const isConnecting = connectionStatus === 'connecting'

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Voice Call</h2>
        <StatusBadge status={connectionStatus} />
      </div>

      {/* Speaking indicator */}
      <div className="flex items-center justify-center py-8">
        <div
          className={`relative flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 ${
            isConnected
              ? isSpeaking
                ? 'bg-blue-500/20'
                : 'bg-green-500/20'
              : 'bg-muted'
          }`}
        >
          {/* Pulsing ring when speaking */}
          {isConnected && isSpeaking && (
            <>
              <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-blue-500/20 animate-pulse" />
            </>
          )}
          
          {isConnecting ? (
            <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
          ) : isConnected ? (
            isSpeaking ? (
              <Mic className="w-10 h-10 text-blue-500" />
            ) : (
              <MicOff className="w-10 h-10 text-green-500" />
            )
          ) : (
            <Phone className="w-10 h-10 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Status text */}
      <p className="text-center text-sm text-muted-foreground mb-4">
        {isConnecting && 'Connecting...'}
        {isConnected && isSpeaking && 'Listening...'}
        {isConnected && !isSpeaking && 'Ready to speak'}
        {connectionStatus === 'disconnected' && 'Ready to start call'}
        {connectionStatus === 'error' && 'Connection failed'}
      </p>

      {/* Error message */}
      {error &&
        (error.startsWith(`${VOICE_QUOTA_ERROR_MARKER}:`) ? (
          <VoiceQuotaHelp rawMessage={error.slice(VOICE_QUOTA_ERROR_MARKER.length + 1).trim()} />
        ) : (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm whitespace-pre-wrap">
            {error}
          </div>
        ))}

      {/* Action button */}
      <div className="flex justify-center">
        {isConnected ? (
          <Button
            onClick={onEndCall}
            variant="destructive"
            size="lg"
            className="gap-2"
          >
            <PhoneOff className="w-5 h-5" />
            End Call
          </Button>
        ) : (
          <Button
            onClick={onStartCall}
            disabled={isConnecting}
            size="lg"
            className="gap-2"
          >
            {isConnecting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Phone className="w-5 h-5" />
            )}
            {isConnecting ? 'Connecting...' : 'Start Call'}
          </Button>
        )}
      </div>
    </div>
  )
}

function VoiceQuotaHelp({ rawMessage }: { rawMessage: string }) {
  return (
    <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm space-y-3">
      <p className="font-medium text-destructive">
        Voice quota (cannot be fixed from this app — it is set by Google / ElevenLabs)
      </p>
      <p className="text-muted-foreground">
        The error below usually means the <strong>model configured on your ElevenLabs agent</strong> (often Gemini) has no quota left, or your ElevenLabs plan hit conversational limits.
      </p>
      <ol className="list-decimal list-inside space-y-2 text-foreground">
        <li>
          In{' '}
          <a
            href="https://elevenlabs.io/app/conversational-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline font-medium"
          >
            ElevenLabs → Conversational AI
          </a>
          , open <strong>your agent → Model</strong> and switch to a model that still has quota on your plan (for example not Gemini until billing is enabled).
        </li>
        <li>
          If you keep Gemini:{' '}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline font-medium"
          >
            Google AI Studio
          </a>{' '}
          → enable billing / check quotas for Generative Language API;{' '}
          <a
            href="https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline font-medium"
          >
            GCP quotas
          </a>
          .
        </li>
        <li>
          Check{' '}
          <a
            href="https://elevenlabs.io/app/subscription"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline font-medium"
          >
            ElevenLabs subscription / usage
          </a>{' '}
          for conversational minutes.
        </li>
      </ol>
      <p className="text-xs text-muted-foreground font-mono break-all border-t border-border pt-2">
        {rawMessage}
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const config = {
    disconnected: { label: 'Offline', className: 'bg-muted text-muted-foreground' },
    connecting: { label: 'Connecting', className: 'bg-yellow-500/20 text-yellow-600' },
    connected: { label: 'Connected', className: 'bg-green-500/20 text-green-600' },
    error: { label: 'Error', className: 'bg-destructive/20 text-destructive' },
  }

  const { label, className } = config[status]

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
