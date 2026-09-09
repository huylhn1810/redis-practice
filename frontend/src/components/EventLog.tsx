import React, { useRef, useEffect } from 'react'
import { EventLogItem } from '../types'
import { Terminal, Trash2, Copy, Check, Radio } from 'lucide-react'

interface EventLogProps {
  logs: EventLogItem[]
  onClearLogs: () => void
  sseConnected: boolean
}

export const EventLog: React.FC<EventLogProps> = ({
  logs,
  onClearLogs,
  sseConnected,
}) => {
  const [copied, setCopied] = React.useState(false)
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.badge}] ${l.message}`)
      .join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getBadgeStyle = (type: EventLogItem['badgeType']) => {
    switch (type) {
      case 'hit':
        return 'bg-success/20 text-success border-success/30'
      case 'miss':
        return 'bg-accent-amber/20 text-accent-amber border-accent-amber/30'
      case 'db':
        return 'bg-primary/20 text-primary border-primary/30'
      case 'delete':
      case 'set':
        return 'bg-accent-teal/20 text-accent-teal border-accent-teal/30'
      case 'error':
        return 'bg-error/20 text-error border-error/30'
      default:
        return 'bg-surface-dark-elevated text-on-dark-soft border-hairline/20'
    }
  }

  return (
    <div className="bg-surface-dark rounded-lg border border-surface-dark-elevated p-5 shadow-md space-y-3 text-on-dark">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-surface-dark-elevated">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-wider font-mono text-on-dark">
            5. Event Log (Server-Sent Events & Realtime Audit)
          </h2>
          <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-surface-dark-elevated text-[11px] font-mono text-on-dark-soft border border-surface-dark-soft">
            <Radio
              className={`w-3 h-3 ${
                sseConnected ? 'text-success animate-pulse' : 'text-muted-soft'
              }`}
            />
            <span>{sseConnected ? 'SSE Stream Active' : 'Connecting...'}</span>
          </div>
        </div>

        {/* Tools */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono rounded bg-surface-dark-elevated hover:bg-surface-dark-soft text-on-dark-soft hover:text-on-dark transition-all disabled:opacity-40"
            title="Copy all logs"
          >
            {copied ? (
              <Check className="w-3 h-3 text-success" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            type="button"
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono rounded bg-surface-dark-elevated hover:bg-surface-dark-soft text-on-dark-soft hover:text-error transition-all disabled:opacity-40"
            title="Clear logs"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Terminal Log Output Window */}
      <div
        ref={logContainerRef}
        className="h-64 overflow-y-auto font-mono text-xs space-y-1.5 pr-1 bg-surface-dark-soft/50 rounded-md p-3 border border-surface-dark-elevated/60"
      >
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-on-dark-soft/50">
            <span>No events recorded yet. Perform an action above to trigger events...</span>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-2.5 py-0.5 leading-relaxed hover:bg-surface-dark-elevated/40 px-1 rounded transition-colors"
            >
              <span className="text-on-dark-soft/60 select-none text-[11px] shrink-0">
                {log.timestamp}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded border text-[10px] font-bold uppercase tracking-wider shrink-0 ${getBadgeStyle(
                  log.badgeType
                )}`}
              >
                {log.badge}
              </span>
              <span className="text-on-dark break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
