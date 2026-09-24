"use client";

import { useState } from "react";
import type { MonthlyGoal, GoalType } from "@/types/profile";
import { createMonthlyGoalAction, deleteMonthlyGoalAction } from "@/app/actions/profile";
import { Target, Plus, X, Film, Tv, Clock, Library, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MonthlyGoalsCardProps {
  goals: MonthlyGoal[];
  onUpdate: () => void;
}

const goalLabels: Record<GoalType, { label: string; icon: React.ElementType; color: string }> = {
  movies_watched: { label: "Movies", icon: Film, color: "text-violet-400" },
  episodes_watched: { label: "Episodes", icon: Tv, color: "text-emerald-400" },
  shows_completed: { label: "Shows", icon: Library, color: "text-sky-400" },
  genre_watch: { label: "Genre", icon: Star, color: "text-rose-400" },
  hours_watched: { label: "Hours", icon: Clock, color: "text-amber-400" },
};

export function MonthlyGoalsCard({ goals, onUpdate }: MonthlyGoalsCardProps) {
  const [showForm, setShowForm] = useState(false);
  const [goalType, setGoalType] = useState<GoalType>("movies_watched");
  const [targetValue, setTargetValue] = useState(10);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    setSaving(true);
    await createMonthlyGoalAction({ goalType, targetValue });
    setSaving(false);
    setShowForm(false);
    onUpdate();
  }

  async function handleDelete(goalId: string) {
    await deleteMonthlyGoalAction({ goalId });
    onUpdate();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Monthly Goals</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-1 text-xs"
        >
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? "Cancel" : "Add Goal"}
        </Button>
      </div>

      {showForm && (
        <div className="glass space-y-3 rounded-2xl p-4">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(goalLabels).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={key}
                  onClick={() => setGoalType(key as GoalType)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition-all ${
                    goalType === key
                      ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                  {cfg.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={999}
              value={targetValue}
              onChange={(e) => setTargetValue(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 rounded-xl border border-border bg-background px-3 py-2 text-sm text-center"
            />
            <Button size="sm" onClick={handleCreate} disabled={saving} className="text-xs">
              {saving ? "Creating..." : "Set Goal"}
            </Button>
          </div>
        </div>
      )}

      {!goals.length && !showForm && (
        <div className="glass flex flex-col items-center justify-center rounded-2xl p-6 text-center">
          <Target className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No goals set this month.</p>
        </div>
      )}

      {goals.length > 0 && (
        <div className="space-y-3">
          {goals.map((goal) => {
            const cfg = goalLabels[goal.goalType] ?? goalLabels.movies_watched;
            const Icon = cfg.icon;
            const progress = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));

            return (
              <div key={goal.id} className="glass rounded-xl p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                    <span className="text-sm font-medium">{cfg.label}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mb-2 flex items-baseline justify-between text-xs text-muted-foreground">
                  <span>
                    {goal.currentValue} / {goal.targetValue}
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      goal.completed
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                        : "bg-gradient-to-r from-primary to-accent"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {goal.completed && (
                  <p className="mt-1 text-right text-[10px] text-emerald-400 font-medium">
                    Complete!
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}