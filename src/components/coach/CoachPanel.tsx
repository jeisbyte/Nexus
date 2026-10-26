import { Brain, AlertTriangle, Zap, Lightbulb, CheckCircle2, ArrowRight } from 'lucide-react'
import type { CoachAdvice } from '@/types'
import './CoachPanel.css'

interface CoachPanelProps {
  advice: CoachAdvice
  compact?: boolean
}

export function CoachPanel({ advice, compact = false }: CoachPanelProps) {
  const hasUrgent = advice.urgentItems.length > 0
  const hasWarnings = advice.warnings.length > 0

  return (
    <div className={`coach-panel${compact ? ' coach-panel--compact' : ''}`} aria-label="Productivity coach advice">
      {/* Header */}
      <div className="coach-header">
        <div className="coach-icon">
          <Brain size={20} />
        </div>
        <div className="coach-header-text">
          <span className="coach-label">Productivity Coach</span>
          <span className="coach-note">Rule-based · Offline · No data sent externally</span>
        </div>
      </div>

      {/* Summary */}
      <div className="coach-summary">
        <p>{advice.summary}</p>
      </div>

      {/* Urgent items */}
      {hasUrgent && (
        <div className="coach-section">
          <h3 className="coach-section-title">
            <AlertTriangle size={14} /> Needs attention
          </h3>
          <ul className="coach-list coach-list--urgent">
            {advice.urgentItems.map((item, i) => (
              <li key={i} className="coach-list-item">
                <span className="coach-bullet" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <div className="coach-section">
          <h3 className="coach-section-title">
            <Zap size={14} /> Workload warnings
          </h3>
          <ul className="coach-list coach-list--warning">
            {advice.warnings.map((w, i) => (
              <li key={i} className="coach-list-item">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Next action */}
      {advice.nextAction && (
        <div className="coach-next-action">
          <ArrowRight size={16} />
          <div>
            <span className="coach-next-label">Suggested next action</span>
            <p className="coach-next-text">{advice.nextAction}</p>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {advice.recommendations.length > 0 && !compact && (
        <div className="coach-section">
          <h3 className="coach-section-title">
            <Lightbulb size={14} /> Recommendations
          </h3>
          <ul className="coach-list">
            {advice.recommendations.map((r, i) => (
              <li key={i} className="coach-list-item">
                <CheckCircle2 size={13} style={{ flexShrink: 0, color: 'var(--success)' }} />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="coach-generated">
        Generated at {new Date(advice.generatedAt).toLocaleTimeString()}
      </p>
    </div>
  )
}
