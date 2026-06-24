import { useState, useEffect } from 'react'
import {
  BarChart, Bar, AreaChart, Area,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const SHEET_ID = '1zMxsyVCKqu6CpZKvqHSx00oFSpy60qFthHuAvMAbe-I'
const API_KEY = 'AIzaSyAXxwBMvSLn0YpaoTq3J3UOjloiep5yTl4'
const SHEET_NAME = 'PRUEBAS'
const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutos

const CHART_TYPES = [
  { id: 'bar', label: 'Barras' },
  { id: 'line', label: 'Línea' },
  { id: 'dot', label: 'Puntos' },
]

function App() {
  const [pruebas, setPruebas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [chartType, setChartType] = useState('bar')
  const [selectedTecnico, setSelectedTecnico] = useState<string | null>(null)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [filtroPais, setFiltroPais] = useState('Todos')

  const fetchSheetData = async () => {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}!A:O?key=${API_KEY}`
      const res = await fetch(url)
      const data = await res.json()
      const rows = data.values || []
      if (rows.length < 2) return
      const headers = rows[0]
      const records = rows.slice(1).map((row: string[]) => {
        const obj: any = {}
        headers.forEach((h: string, i: number) => {
          obj[h] = row[i] || ''
        })
        return obj
      })
      setPruebas(records)
      setLastUpdate(new Date().toLocaleTimeString('es-GT'))
    } catch (e) {
      console.error('Error leyendo Sheets:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSheetData()
    const interval = setInterval(fetchSheetData, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  const pruebasFiltradas = pruebas.filter(p => {
    const fecha = p['Fecha'] || ''
    const pais = p['Pais'] || ''
    if (fechaDesde && fecha < fechaDesde) return false
    if (fechaHasta && fecha > fechaHasta) return false
    if (filtroPais !== 'Todos' && pais !== filtroPais) return false
    return true
  })

  const total = pruebas.length
  const exitosas = pruebas.filter(p => p['Estatus'] === 'Exitosa').length
  const fallidas = pruebas.filter(p => p['Estatus'] === 'Fallida').length
  const tasa = total > 0 ? Math.round((exitosas / total) * 100) : 0

  const stats = [
    { label: 'Total Pruebas', value: total || '—' },
    { label: 'Tasa de Éxito', value: total > 0 ? `${tasa}%` : '—' },
    { label: 'Pruebas Fallidas', value: fallidas || '—' },
  ]

  const tecnicoMap: Record<string, { registros: number, exitosas: number, fallidas: number, pais: string }> = {}
  pruebasFiltradas.forEach(p => {
    const nombre = p['Nombre Usuario'] || 'Sin nombre'
    const pais = p['Pais'] || ''
    if (!tecnicoMap[nombre]) tecnicoMap[nombre] = { registros: 0, exitosas: 0, fallidas: 0, pais }
    tecnicoMap[nombre].registros++
    if (p['Estatus'] === 'Exitosa') tecnicoMap[nombre].exitosas++
    else tecnicoMap[nombre].fallidas++
  })

  const tecnicoData = Object.entries(tecnicoMap).map(([nombre, d]) => ({
    nombre, registros: d.registros, exitosas: d.exitosas,
    fallidas: d.fallidas, pais: d.pais,
    tasa: Math.round((d.exitosas / d.registros) * 100)
  }))

  const getTecnicoStats = (nombre: string) => {
    const registros = pruebas.filter(p => p['Nombre Usuario'] === nombre)
    const exitosas = registros.filter(p => p['Estatus'] === 'Exitosa').length
    const fallidas = registros.filter(p => p['Estatus'] === 'Fallida').length
    const tasa = registros.length > 0 ? Math.round((exitosas / registros.length) * 100) : 0
    const pais = registros[0]?.['Pais'] || '—'
    const porDia: Record<string, number> = {}
    registros.forEach(p => {
      const f = p['Fecha']
      if (f) porDia[f] = (porDia[f] || 0) + 1
    })
    const maxPorDia = Object.values(porDia).length > 0 ? Math.max(...Object.values(porDia)) : 0
    const diasActivos = Object.keys(porDia).length
    const fechas = registros.map(p => p['Fecha']).filter(Boolean).sort()
    return {
      total: registros.length, exitosas, fallidas, tasa, pais,
      maxPorDia, diasActivos,
      fechaInicio: fechas[0] || '—',
      fechaUltima: fechas[fechas.length - 1] || '—',
      registros
    }
  }

  const cardHover = (el: HTMLDivElement, enter: boolean) => {
    el.style.borderColor = enter ? '#C8102E' : '#E8E6E3'
    el.style.transform = enter ? 'translateY(-6px)' : 'translateY(0)'
    el.style.boxShadow = enter ? '0 12px 40px rgba(200,16,46,0.25)' : 'none'
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: '#1A1816', borderRadius: '8px', padding: '8px 14px',
          fontFamily: "'DM Sans', sans-serif", fontSize: '13px',
          color: '#fff', pointerEvents: 'none'
        }}>
          <span style={{ color: '#C8102E', fontWeight: 700 }}>{payload[0].payload.nombre}</span>
          <span style={{ color: '#A09C96', marginLeft: '8px' }}>— click para ver perfil</span>
        </div>
      )
    }
    return null
  }

  const xAxis = (
    <XAxis
      dataKey="nombre"
      tick={{ fontSize: 11, fill: '#635F5A', fontFamily: "'DM Sans', sans-serif" }}
      angle={-35} textAnchor="end" interval={0}
    />
  )
  const yAxis = <YAxis tick={{ fontSize: 12, fill: '#635F5A' }} allowDecimals={false} />

  const renderChart = () => {
    if (loading) return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#A09C96', fontSize: '13px' }}>
        Cargando datos...
      </div>
    )
    if (tecnicoData.length === 0) return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#A09C96', fontSize: '13px' }}>
        Sin datos para el rango seleccionado
      </div>
    )

    if (chartType === 'bar') return (
      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={tecnicoData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E3" />
          {xAxis}{yAxis}
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(200,16,46,0.06)' }} />
          <Bar dataKey="registros" radius={[6, 6, 0, 0]}>
            {tecnicoData.map((d, i) => (
              <Cell key={i}
                fill={selectedTecnico === d.nombre ? '#E8314D' : i % 2 === 0 ? '#C8102E' : '#8B0B1F'}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedTecnico(d.nombre)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )

    if (chartType === 'line') return (
      <ResponsiveContainer width="100%" height={380}>
        <AreaChart data={tecnicoData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
          <defs>
            <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#C8102E" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#C8102E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E3" />
          {xAxis}{yAxis}
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="registros" stroke="#C8102E" strokeWidth={3} fill="url(#colorRed)"
            dot={(props: any) => (
              <circle {...props} r={6} fill="#C8102E" style={{ cursor: 'pointer' }}
                onClick={() => setSelectedTecnico(props.payload.nombre)} />
            )}
          />
        </AreaChart>
      </ResponsiveContainer>
    )

    if (chartType === 'dot') return (
      <ResponsiveContainer width="100%" height={380}>
        <ScatterChart data={tecnicoData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E3" />
          {xAxis}
          <YAxis dataKey="registros" tick={{ fontSize: 12, fill: '#635F5A' }} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={tecnicoData}>
            {tecnicoData.map((d, i) => (
              <Cell key={i}
                fill={selectedTecnico === d.nombre ? '#E8314D' : i % 2 === 0 ? '#C8102E' : '#8B0B1F'}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedTecnico(d.nombre)}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    )
  }

  const inputStyle: React.CSSProperties = {
    padding: '8px 14px', border: '1.5px solid #E8E6E3', borderRadius: '8px',
    fontSize: '13px', fontFamily: "'DM Sans', sans-serif", color: '#1A1816',
    background: '#FFFFFF', outline: 'none', cursor: 'pointer'
  }

  const stats2 = selectedTecnico ? getTecnicoStats(selectedTecnico) : null

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', background: '#FAF9F7' }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* HERO */}
      <div style={{
        background: '#1A1816', padding: '60px 40px 50px',
        textAlign: 'center', position: 'relative', overflow: 'hidden', width: '100%', boxSizing: 'border-box'
      }}>
        <div style={{
          position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '350px',
          background: 'radial-gradient(ellipse, rgba(200,16,46,0.4) 0%, transparent 70%)',
          animation: 'pulseGlow 4s ease-in-out infinite', pointerEvents: 'none'
        }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, #C8102E, transparent)' }} />
        <div style={{
          display: 'inline-block', background: '#C8102E', color: 'white',
          fontSize: '11px', fontWeight: 600, letterSpacing: '3px',
          textTransform: 'uppercase', padding: '6px 18px', borderRadius: '2px',
          marginBottom: '24px', position: 'relative', zIndex: 1
        }}>PTToC · QA Platform</div>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(48px, 8vw, 84px)',
          color: '#FFFFFF', lineHeight: 0.95, letterSpacing: '2px', position: 'relative', zIndex: 1, margin: 0
        }}>
          MÉTRICAS QA <span style={{ color: '#C8102E' }}>CAMPO</span>
        </h1>
        <p style={{ fontSize: '15px', color: '#A09C96', marginTop: '16px', position: 'relative', zIndex: 1 }}>
          Pruebas funcionales de campo PTT in House
        </p>
        {lastUpdate && (
          <p style={{ fontSize: '11px', color: '#635F5A', marginTop: '8px', position: 'relative', zIndex: 1, letterSpacing: '1px' }}>
            Última actualización: {lastUpdate} · Refresca cada 5 min
          </p>
        )}
      </div>

      {/* CONTENIDO */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 40px' }}>

        <div style={{ marginBottom: '32px', borderBottom: '2px solid #E8E6E3', paddingBottom: '20px' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '42px', color: '#1A1816', lineHeight: 1, margin: 0 }}>
            MÉTRICAS <span style={{ color: '#C8102E' }}>GENERALES</span>
          </h2>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#A09C96' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', marginBottom: '8px' }}>CARGANDO DATOS...</div>
            <div style={{ fontSize: '13px' }}>Conectando con Google Sheets</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '60px' }}>
              {stats.map(s => (
                <div key={s.label} style={{
                  background: '#FFFFFF', borderRadius: '16px', padding: '32px 24px',
                  border: '1.5px solid #E8E6E3', transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)'
                }}
                  onMouseEnter={e => cardHover(e.currentTarget as HTMLDivElement, true)}
                  onMouseLeave={e => cardHover(e.currentTarget as HTMLDivElement, false)}
                >
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#C8102E', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>{s.label}</div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '52px', color: '#1A1816', lineHeight: 1 }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '24px', borderBottom: '2px solid #E8E6E3', paddingBottom: '20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#C8102E', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '6px' }}>Actividad</div>
                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '42px', color: '#1A1816', lineHeight: 1, margin: 0 }}>
                  REPORTES POR <span style={{ color: '#C8102E' }}>TÉCNICO</span>
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {CHART_TYPES.map(c => (
                  <button key={c.id} onClick={() => setChartType(c.id)} style={{
                    padding: '8px 16px', border: 'none', borderRadius: '6px',
                    fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.2s',
                    background: chartType === c.id ? '#C8102E' : '#F5F4F2',
                    color: chartType === c.id ? 'white' : '#635F5A',
                    boxShadow: chartType === c.id ? '0 4px 12px rgba(200,16,46,0.35)' : 'none'
                  }}>{c.label}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', background: '#F5F4F2', borderRadius: '8px', padding: '4px', gap: '4px' }}>
                {['Todos', 'Guatemala', 'El Salvador'].map(p => (
                  <button key={p} onClick={() => { setFiltroPais(p); setSelectedTecnico(null) }} style={{
                    padding: '7px 14px', border: 'none', borderRadius: '6px',
                    fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.2s',
                    background: filtroPais === p ? '#1A1816' : 'transparent',
                    color: filtroPais === p ? 'white' : '#635F5A',
                  }}>{p}</button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#635F5A', letterSpacing: '2px', textTransform: 'uppercase' }}>Desde</span>
                <input type="date" value={fechaDesde} onChange={e => { setFechaDesde(e.target.value); setSelectedTecnico(null) }} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#635F5A', letterSpacing: '2px', textTransform: 'uppercase' }}>Hasta</span>
                <input type="date" value={fechaHasta} onChange={e => { setFechaHasta(e.target.value); setSelectedTecnico(null) }} style={inputStyle} />
              </div>
              {(fechaDesde || fechaHasta || filtroPais !== 'Todos') && (
                <button onClick={() => { setFechaDesde(''); setFechaHasta(''); setFiltroPais('Todos'); setSelectedTecnico(null) }} style={{
                  padding: '8px 14px', border: '1.5px solid #C8102E', borderRadius: '8px',
                  background: 'transparent', color: '#C8102E', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif"
                }}>Limpiar filtros</button>
              )}
            </div>

            <div style={{
              background: '#FFFFFF', borderRadius: '16px', padding: '32px',
              border: '1.5px solid #E8E6E3', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '32px'
            }}>
              {renderChart()}
            </div>
          </>
        )}
      </div>

      {/* MODAL */}
      {selectedTecnico && stats2 && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(26,24,22,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999, padding: '20px', backdropFilter: 'blur(4px)'
        }} onClick={() => setSelectedTecnico(null)}>
          <div style={{
            background: '#FFFFFF', borderRadius: '20px', width: '100%', maxWidth: '700px',
            overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
            animation: 'modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)'
          }} onClick={e => e.stopPropagation()}>

            <div style={{ background: '#FFFFFF', padding: '28px 32px', position: 'relative', borderBottom: '1px solid #E8E6E3' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#C8102E', borderRadius: '20px 0 0 0' }} />
              <button onClick={() => setSelectedTecnico(null)} style={{
                position: 'absolute', top: '20px', right: '20px',
                background: '#F5F4F2', border: 'none', color: '#635F5A',
                width: '36px', height: '36px', borderRadius: '50%',
                cursor: 'pointer', fontSize: '15px', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontFamily: "'DM Sans', sans-serif"
              }}>✕</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '12px',
                  background: '#1A1816', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Bebas Neue', sans-serif", fontSize: '26px', color: 'white',
                }}>
                  {selectedTecnico.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#C8102E', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Perfil de técnico
                  </div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '34px', color: '#1A1816', lineHeight: 1, marginBottom: '8px' }}>
                    {selectedTecnico}
                  </div>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: '#635F5A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C8102E', display: 'inline-block' }} />
                      {stats2.pais}
                    </span>
                    <span style={{ fontSize: '12px', color: '#635F5A' }}>Activo desde {stats2.fechaInicio}</span>
                    <span style={{ fontSize: '12px', color: '#635F5A' }}>Última prueba: {stats2.fechaUltima}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {[
                { label: 'Total', value: stats2.total, color: '#1A1816', bg: '#FAF9F7' },
                { label: 'Exitosas', value: stats2.exitosas, color: '#16a34a', bg: '#f0fdf4' },
                { label: 'Fallidas', value: stats2.fallidas, color: '#dc2626', bg: '#fef2f2' },
                { label: 'Tasa éxito', value: `${stats2.tasa}%`, color: '#C8102E', bg: '#fff5f5' },
              ].map((s, i) => (
                <div key={s.label} style={{
                  padding: '20px 16px', textAlign: 'center', background: s.bg,
                  borderRight: i < 3 ? '1px solid #E8E6E3' : 'none',
                  borderBottom: '1px solid #E8E6E3'
                }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '38px', color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: '#A09C96', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #E8E6E3' }}>
              <div style={{ padding: '20px 24px', borderRight: '1px solid #E8E6E3' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#A09C96', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>Máximo en un día</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '32px', color: '#1A1816' }}>
                  {stats2.maxPorDia} <span style={{ fontSize: '16px', color: '#A09C96' }}>pruebas</span>
                </div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#A09C96', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>Días activos</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '32px', color: '#1A1816' }}>
                  {stats2.diasActivos} <span style={{ fontSize: '16px', color: '#A09C96' }}>días</span>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px 8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#A09C96', letterSpacing: '2px', textTransform: 'uppercase' }}>Historial de pruebas</div>
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ background: '#F5F4F2' }}>
                    {['Fecha', 'Hora', 'Ubicación', 'Consola', 'Estatus'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#635F5A', letterSpacing: '2px', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats2.registros.slice().reverse().map((p: any, i: number) => (
                    <tr key={i} style={{ borderTop: '1px solid #F5F4F2' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#FAF9F7'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 16px', fontSize: '12px', fontFamily: "'DM Mono', monospace", color: '#1A1816' }}>{p['Fecha']}</td>
                      <td style={{ padding: '10px 16px', fontSize: '12px', fontFamily: "'DM Mono', monospace", color: '#635F5A' }}>{p['Hora']}</td>
                      <td style={{ padding: '10px 16px', fontSize: '12px', color: '#635F5A' }}>{p['Ubicacion Test']}</td>
                      <td style={{ padding: '10px 16px', fontSize: '12px', color: '#635F5A' }}>{p['Ubicacion Consola']}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                          background: p['Estatus'] === 'Exitosa' ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                          color: p['Estatus'] === 'Exitosa' ? '#16a34a' : '#dc2626'
                        }}>{p['Estatus']}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '16px 24px', textAlign: 'right', borderTop: '1px solid #E8E6E3' }}>
              <button onClick={() => setSelectedTecnico(null)} style={{
                background: '#C8102E', color: 'white', border: 'none',
                padding: '10px 28px', borderRadius: '8px', fontSize: '13px',
                fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                boxShadow: '0 4px 12px rgba(200,16,46,0.35)'
              }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { margin: 0; padding: 0; overflow-x: hidden; }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.7; transform: translateX(-50%) scale(1); }
          50% { opacity: 1; transform: translateX(-50%) scale(1.08); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.92) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default App