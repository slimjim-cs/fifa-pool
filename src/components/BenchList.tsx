import { capitalizeName } from '@/lib/utils'

interface Player {
  id: number
  player_name: string
  position: string
  is_starter: boolean
}

interface Props {
  teamName: string
  players: Player[]
}

export default function BenchList({ teamName, players }: Props) {
  const bench = players.filter((p) => !p.is_starter)
  const midpoint = Math.ceil(bench.length / 2)
  const leftCol = bench.slice(0, midpoint)
  const rightCol = bench.slice(midpoint)

  return (
    <div className="bench-section">
      <h4 className="bench-title">{capitalizeName(teamName)} Bench ({bench.length})</h4>
      {bench.length === 0 ? (
        <p className="bench-empty">No substitutes</p>
      ) : (
        <div className="bench-columns">
          <ul className="bench-list">
            {leftCol.map((p) => (
              <li key={p.id} className="bench-player">
                <span className={`bench-pos pos-${p.position.toLowerCase()}`}>{p.position}</span>
                {p.player_name}
              </li>
            ))}
          </ul>
          <ul className="bench-list">
            {rightCol.map((p) => (
              <li key={p.id} className="bench-player">
                <span className={`bench-pos pos-${p.position.toLowerCase()}`}>{p.position}</span>
                {p.player_name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
