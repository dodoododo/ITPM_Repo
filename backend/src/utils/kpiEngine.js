const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DIFFICULTY_WEIGHTS = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 5,
};

const calculateTaskKpi = (task) => {
  const difficultyWeight = DIFFICULTY_WEIGHTS[task.priority] || DIFFICULTY_WEIGHTS.medium;
  const finishDate = task.actualFinishDate || new Date();
  const dueDate = task.due_date;
  const daysDelta = dueDate ? Math.ceil((finishDate.getTime() - dueDate.getTime()) / MS_PER_DAY) : 0;
  const completedEarly = Boolean(dueDate && daysDelta <= 0);
  const timelinessBonus = dueDate ? Math.max(Math.min(-daysDelta * 2, 10), -20) : 0;
  const taskWeight = Number(task.kpi_weight || 0);
  const baseScore = taskWeight > 0 ? taskWeight : difficultyWeight * 20;
  const score = Math.max(0, baseScore + timelinessBonus);

  return {
    score,
    difficulty_weight: difficultyWeight,
    timeliness_bonus: timelinessBonus,
    days_delta: daysDelta,
    completed_early: completedEarly,
    calculated_at: new Date(),
  };
};

const triggerTaskKpiCalculation = async (Task, taskId) => {
  const task = await Task.findById(taskId);
  if (!task) return null;

  const kpiResult = calculateTaskKpi(task);
  task.kpi_result = kpiResult;
  await task.save();

  return kpiResult;
};

module.exports = {
  calculateTaskKpi,
  triggerTaskKpiCalculation,
};
