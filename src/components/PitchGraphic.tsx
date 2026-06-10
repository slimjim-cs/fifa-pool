import { capitalizeName } from '@/lib/utils'

interface Player {
  id: number
  player_name: string
  position: string
  is_starter: boolean
  pitch_left: number | null
  pitch_top: number | null
}

interface Props {
  teamName: string
  opponentName: string
  players: Player[]
}

const POSITION_COLORS: Record<string, string> = {
  GK: '#f5c842',
  DEF: '#4290f5',
  MID: '#42c96b',
  ATT: '#f54242',
}

function PlayerNode({ player }: { player: Player }) {
  if (!player.pitch_left || !player.pitch_top) return null

  const color = POSITION_COLORS[player.position] ?? '#888'

  return (
    <g>
      <circle cx={player.pitch_left} cy={player.pitch_top} r={3.5} fill={color} stroke="#fff" strokeWidth={1} />
      <text
        x={player.pitch_left}
        y={player.pitch_top + 5.5}
        textAnchor="middle"
        fill="#fff"
        fontSize={2.8}
        fontWeight={600}
        stroke="#0b1121"
        strokeWidth={0.4}
        paintOrder="stroke"
      >
        {player.player_name}
      </text>
    </g>
  )
}

export default function PitchGraphic({ teamName, opponentName, players }: Props) {
  const starters = players.filter((p) => p.is_starter)

  return (
    <div className="pitch-container">
      <div className="pitch-header">
        <span className="pitch-side home">{capitalizeName(teamName)}</span>
        <span className="pitch-vs">vs</span>
        <span className="pitch-side away">{capitalizeName(opponentName)}</span>
      </div>
      <svg viewBox="0 0 100 100" className="pitch-svg" preserveAspectRatio="xMidYMid meet">
        <rect x={0} y={0} width={100} height={100} fill="#2d8a4e" />
        <rect x={2} y={2} width={96} height={96} fill="none" stroke="#fff" strokeWidth={0.4} opacity={0.6} />
        <line x1={2} y1={50} x2={98} y2={50} stroke="#fff" strokeWidth={0.3} opacity={0.5} />
        <circle cx={50} cy={50} r={12} fill="none" stroke="#fff" strokeWidth={0.3} opacity={0.5} />
        <circle cx={50} cy={50} r={1} fill="#fff" opacity={0.5} />
        <rect x={18} y={2} width={64} height={14} fill="none" stroke="#fff" strokeWidth={0.3} opacity={0.4} />
        <rect x={18} y={84} width={64} height={14} fill="none" stroke="#fff" strokeWidth={0.3} opacity={0.4} />
        <rect x={32} y={2} width={36} height={6} fill="none" stroke="#fff" strokeWidth={0.3} opacity={0.4} />
        <rect x={32} y={92} width={36} height={6} fill="none" stroke="#fff" strokeWidth={0.3} opacity={0.4} />
        <circle cx={50} cy={12} r={0.6} fill="#fff" opacity={0.5} />
        <circle cx={50} cy={88} r={0.6} fill="#fff" opacity={0.5} />
        <text x={50} y={97} textAnchor="middle" fill="#fff" fontSize={3} opacity={0.4} fontWeight={600}>
          {capitalizeName(teamName)}
        </text>
        <text x={50} y={5} textAnchor="middle" fill="#fff" fontSize={3} opacity={0.4} fontWeight={600}>
          {capitalizeName(opponentName)}
        </text>
        {starters.map((p) => (
          <PlayerNode key={p.id} player={p} />
        ))}
      </svg>

      <div className="pitch-legend">
        {Object.entries(POSITION_COLORS).map(([pos, color]) => (
          <span key={pos} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            {pos}
          </span>
        ))}
      </div>
    </div>
  )
}
