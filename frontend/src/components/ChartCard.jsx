import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const ChartCard = ({ title, data = [], colors = ['#2563EB'], className = '', right = null }) => {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  const chartData = meses.map((m, i) => {
    const mesData = data.find(d => d.mes === i + 1)
    return { name: m, total: mesData ? mesData.total : 0 }
  })

  return (
    <div className={`bg-white rounded-lg shadow p-4 h-[350px] flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {right}
      </div>
      <div className="flex-grow min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="name" stroke="#333" />
            <YAxis stroke="#333" />
            <Tooltip />
            <Bar dataKey="total" fill={colors[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default ChartCard
