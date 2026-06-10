import { capitalizeName } from '@/lib/utils'

interface Props {
  side: 'home' | 'away'
  country: string
  meta: {
    formation?: string
    average_starter_age?: number
    starter_value?: string
    rank?: number
    group?: string
  } | null
}

export default function TeamMetaPanel({ side, country, meta }: Props) {
  return (
    <div className={`team-meta ${side}`}>
      <h3 className="team-name">{capitalizeName(country)}</h3>
      {meta ? (
        <div className="team-stats">
          {meta.group && (
            <div className="stat-row">
              <span className="stat-label">Group</span>
              <span className="stat-value">{meta.group}</span>
            </div>
          )}
          <div className="stat-row">
            <span className="stat-label">Formation</span>
            <span className="stat-value">{meta.formation ?? '—'}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Avg Age</span>
            <span className="stat-value">{meta.average_starter_age ?? '—'}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Value</span>
            <span className="stat-value">{meta.starter_value ?? '—'}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Rank</span>
            <span className="stat-value">{meta.rank ?? '—'}</span>
          </div>
        </div>
      ) : (
        <p className="no-data">No data</p>
      )}
    </div>
  )
}
