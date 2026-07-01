import { useState, useEffect } from 'react'
import { getCruceGPS } from '../pttApi'

interface CruceCall {
  alias: string
  bd_call_id: number
  bd_lat: number
  bd_lon: number
  inrico_distance_m: number
  inrico_lat: number
  inrico_lon: number
  started_at: string
  status: 'match' | 'mismatch' | 'no_inrico'
  note: string
}

interface CruceUser {
  alias: string
  avg_distance_m: number
  bd_no_gps: number
  calls: CruceCall[]
  matched: number
  mismatched: number
  missing_inrico: number
  status: 'validado' | 'parcial' | 'diferencias'
  total_calls: number
  validation_pct: number
}

interface CruceData {
  coverage_pct: number
  date: string
  total_calls: number
  total_matched: number
  total_mismatched: number
  total_missing_inrico: number
  users: CruceUser[]
}

function getYesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  return `${parseInt(day)} de ${months[parseInt(month) - 1]} de ${year}`
}

const STATUS_STYLE: Record<string, { color: string, bg: string, border: string }> = {
  validado:    { color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.3)'  },
  parcial:     { color: '#facc15', bg: 'rgba(250,204,21,0.1)',  border: 'rgba(250,204,21,0.3)'  },
  diferencias: { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)' },
}

export default function CruceGPS() {
  const [data, setData] = useState<CruceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<CruceUser | null>(null)

  useEffect(() => {
  const CACHE_KEY = 'cruce_gps_cache'
  const date = getYesterday()

  getCruceGPS(date)
    .then((res) => {
      if (res.success) {
        setData(res.data)
        localStorage.setItem(CACHE_KEY, JSON.stringify(res.data))
      } else {
        // API falló, intentar cargar caché
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          setData(JSON.parse(cached))
        } else {
          setError(res.error?.message || 'Error al cargar datos')
        }
      }
    })
    .catch(() => {
      // Conexión falló, intentar cargar caché
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        setData(JSON.parse(cached))
      } else {
        setError('No se pudo conectar con la API')
      }
    })
    .finally(() => setLoading(false))
}, [])

  return (
    <div style={{
      background: '#1A1816',
      borderRadius: '20px',
      padding: '48px 40px',
      marginTop: '48px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
    }}>
      <div style={{
        position: 'absolute', top: '-80px', right: '-80px',
        width: '400px', height: '400px',
        background: 'radial-gradient(ellipse, rgba(200,16,46,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ marginBottom: '40px', position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'inline-block', background: '#C8102E', color: 'white',
          fontSize: '11px', fontWeight: 600, letterSpacing: '3px',
          textTransform: 'uppercase', padding: '5px 14px', borderRadius: '2px',
          marginBottom: '16px'
        }}>
          Validación GPS · PTT IN HOUSE
        </div>
        <h2 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '48px', color: '#FFFFFF',
          lineHeight: 1, letterSpacing: '2px', margin: 0
        }}>
          CRUCE <span style={{ color: '#C8102E' }}>GPS</span>
        </h2>
        {data && (
          <p style={{ color: '#635F5A', fontSize: '13px', marginTop: '8px', letterSpacing: '1px' }}>
            Datos del {formatDate(data.date)}
          </p>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', color: '#A09C96' }}>
            CARGANDO DATOS GPS...
          </div>
        </div>
      )}

      {error && !data && (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ color: '#f87171', fontSize: '13px' }}>Error: {error}</div>
        </div>
      )}

      {data && (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '40px' }}>
            {[
              { label: 'Total llamadas', value: data.total_calls, color: '#FFFFFF' },
              { label: 'Coincidencias',  value: data.total_matched, color: '#4ade80' },
              { label: 'Discrepancias',  value: data.total_mismatched, color: '#f87171' },
              { label: 'Cobertura GPS',  value: `${data.coverage_pct.toFixed(1)}%`, color: '#C8102E' },
            ].map(card => (
              <div key={card.label} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', padding: '24px 20px',
              }}>
                <div style={{
                  fontSize: '10px', fontWeight: 700, color: '#635F5A',
                  letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px'
                }}>{card.label}</div>
                <div style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '44px', color: card.color, lineHeight: 1
                }}>{card.value}</div>
              </div>
            ))}
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px', overflow: 'hidden', marginBottom: '24px'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Usuario', 'Llamadas', 'Match', 'Mismatch', 'Validación', 'Status', 'Detalle'].map(h => (
                    <th key={h} style={{
                      padding: '14px 16px',
                      fontSize: '10px', fontWeight: 700, color: '#635F5A',
                      letterSpacing: '2px', textTransform: 'uppercase',
                      textAlign: h === 'Usuario' ? 'left' : 'center'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.users.map((user, i) => {
                  const s = STATUS_STYLE[user.status]
                  const hasData = user.total_calls > 0 && (user.matched > 0 || user.mismatched > 0)
                  return (
                    <tr key={user.alias} style={{
                      borderBottom: i < data.users.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      transition: 'background 0.2s',
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px', color: '#FFFFFF', fontWeight: 600, fontSize: '13px' }}>
                        {user.alias}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#A09C96', fontSize: '13px', textAlign: 'center' }}>
                        {user.total_calls}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#4ade80', fontSize: '13px', textAlign: 'center', fontWeight: 600 }}>
                        {user.matched}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#f87171', fontSize: '13px', textAlign: 'center', fontWeight: 600 }}>
                        {user.mismatched}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          fontFamily: "'Bebas Neue', sans-serif",
                          fontSize: '20px', color: s.color
                        }}>{user.validation_pct.toFixed(1)}%</span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                          background: s.bg, border: `1px solid ${s.border}`, color: s.color,
                          letterSpacing: '1px'
                        }}>{user.status}</span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => hasData && setSelectedUser(selectedUser?.alias === user.alias ? null : user)}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(200,16,46,0.4)',
                            color: '#C8102E', borderRadius: '6px', padding: '5px 12px',
                            fontSize: '11px', fontWeight: 600,
                            letterSpacing: '1px', textTransform: 'uppercase',
                            transition: 'all 0.2s',
                            opacity: hasData ? 1 : 0.3,
                            cursor: hasData ? 'pointer' : 'not-allowed',
                          }}
                          onMouseEnter={e => {
                            if (!hasData) return
                            ;(e.currentTarget as HTMLButtonElement).style.background = '#C8102E'
                            ;(e.currentTarget as HTMLButtonElement).style.color = 'white'
                          }}
                          onMouseLeave={e => {
                            if (!hasData) return
                            ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                            ;(e.currentTarget as HTMLButtonElement).style.color = '#C8102E'
                          }}
                        >
                          {selectedUser?.alias === user.alias ? 'Cerrar' : 'Ver'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {selectedUser && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(200,16,46,0.3)',
              borderRadius: '12px', padding: '24px',
              animation: 'fadeIn 0.2s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#C8102E', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Detalle de llamadas
                  </div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', color: '#FFFFFF' }}>
                    {selectedUser.alias}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '24px', textAlign: 'center' }}>
                  {[
                    { label: 'Total', value: selectedUser.total_calls, color: '#FFFFFF' },
                    { label: 'Match', value: selectedUser.matched, color: '#4ade80' },
                    { label: 'Mismatch', value: selectedUser.mismatched, color: '#f87171' },
                    { label: 'Dist. prom.', value: `${selectedUser.avg_distance_m.toFixed(1)}m`, color: '#facc15' },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '10px', color: '#635F5A', letterSpacing: '1px', textTransform: 'uppercase' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {['Hora', 'Status', 'Distancia', 'Nota'].map(h => (
                        <th key={h} style={{
                          padding: '10px 14px', fontSize: '10px', fontWeight: 700,
                          color: '#635F5A', letterSpacing: '2px', textTransform: 'uppercase',
                          textAlign: h === 'Nota' ? 'left' : 'center'
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUser.calls.map(call => (
                      <tr key={call.bd_call_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: '#A09C96', fontSize: '12px', fontFamily: "'DM Mono', monospace" }}>
                          {new Date(call.started_at).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{ color: call.status === 'match' ? '#4ade80' : '#f87171', fontSize: '11px', fontWeight: 700, letterSpacing: '1px' }}>
                            {call.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: '#A09C96', fontSize: '12px' }}>
                          {call.inrico_distance_m ? `${call.inrico_distance_m.toFixed(1)} m` : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#635F5A', fontSize: '12px' }}>
                          {call.note || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}