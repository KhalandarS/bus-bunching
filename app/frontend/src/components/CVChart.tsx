import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, YAxis } from "recharts";

export interface ToggleMarker {
  index: number;
  enabled: boolean;
}

interface CVChartProps {
  cvHistory: number[];
  toggleMarkers: ToggleMarker[];
}

export default function CVChart({ cvHistory, toggleMarkers }: CVChartProps) {
  const maxCv = Math.max(0.5, ...cvHistory, 0) * 1.1;
  const data = cvHistory.map((cv, idx) => ({ idx, cv }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#2a2f38" horizontal vertical={false} />
        <YAxis
          domain={[0, maxCv]}
          tick={{ fill: "#6b7280", fontSize: 10 }}
          tickFormatter={(v: number) => v.toFixed(1)}
          width={30}
          axisLine={false}
          tickLine={false}
        />
        {toggleMarkers.map((tm) => (
          <ReferenceLine
            key={tm.index}
            x={tm.index}
            stroke={tm.enabled ? "#33c17a" : "#ff6b5e"}
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        ))}
        <Line type="monotone" dataKey="cv" stroke="#4f9dff" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
