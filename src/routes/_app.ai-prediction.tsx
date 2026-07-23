import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, BrainCircuit, Clock3, Sparkles, TrendingUp, Users } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { fetchAIInsights, type AIInsightsData, type WorkforceInsight } from "@/lib/hrms-db";

export const Route = createFileRoute("/_app/ai-prediction")({
  head: () => ({ meta: [{ title: "AI Prediction - Hivetree" }] }),
  component: AIPredictionPage,
});

const EMPTY: AIInsightsData = {
  configured: true,
  startDate: "",
  endDate: "",
  riskScore: 0,
  predictedAttendanceRate: 0,
  predictedOvertimeHours: 0,
  predictedAbsences: 0,
  insights: [],
  trend: [],
};

function AIPredictionPage() {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAIInsights()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="AI Workforce Insights"
        description="Free local trend analysis from attendance, overtime, absenteeism, and late-arrival history."
        actions={
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Local model
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Risk score"
          value={loading ? "..." : `${data.riskScore}/100`}
          icon={BrainCircuit}
          delta="Lower is better"
          trend={data.riskScore > 60 ? "down" : "up"}
        />
        <StatCard
          label="Predicted attendance"
          value={loading ? "..." : `${data.predictedAttendanceRate}%`}
          icon={Users}
          delta="Next workday"
          trend={data.predictedAttendanceRate >= 85 ? "up" : "down"}
        />
        <StatCard
          label="Predicted absences"
          value={loading ? "..." : String(data.predictedAbsences)}
          icon={AlertTriangle}
          delta="Next workday"
          trend={data.predictedAbsences > 2 ? "down" : "up"}
        />
        <StatCard
          label="Overtime forecast"
          value={loading ? "..." : `${data.predictedOvertimeHours.toFixed(1)}h`}
          icon={Clock3}
          delta="Next workday"
          trend={data.predictedOvertimeHours > 2 ? "down" : "up"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-elevate-sm)] lg:col-span-2">
          <div className="mb-1 text-sm font-semibold">Attendance and workload trend</div>
          <div className="mb-4 text-xs text-muted-foreground">
            {data.startDate && data.endDate ? `${data.startDate} to ${data.endDate}` : "Loading"}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend} margin={{ left: -20, right: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => String(value).slice(5)}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="attendanceRate"
                  name="Attendance %"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="late"
                  name="Late"
                  stroke="var(--color-chart-4)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="overtime"
                  name="Overtime h"
                  stroke="var(--color-chart-5)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-elevate-sm)]">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4" />
            Recommendations
          </div>
          <div className="space-y-3">
            {data.insights.length ? (
              data.insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)
            ) : (
              <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                {loading
                  ? "Analyzing attendance history..."
                  : "Not enough attendance history yet. Scan attendance for a few days to generate useful insights."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: WorkforceInsight }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{insight.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{insight.summary}</div>
        </div>
        <Badge
          variant={
            insight.severity === "High"
              ? "destructive"
              : insight.severity === "Medium"
                ? "outline"
                : "secondary"
          }
        >
          {insight.severity}
        </Badge>
      </div>
      <div className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-xs">
        <span className="font-semibold">{insight.metric}</span>
        <span className="text-muted-foreground"> - {insight.recommendation}</span>
      </div>
    </div>
  );
}
