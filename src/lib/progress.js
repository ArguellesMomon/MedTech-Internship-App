export function quotaKey(section, procedure) {
  return (
    String(section || '')
      .trim()
      .toLowerCase() +
    '::' +
    String(procedure || '')
      .trim()
      .toLowerCase()
  );
}
export function countLoggedProcedures(logs) {
  const counts = {};
  for (const log of logs) {
    const key = quotaKey(log.section_name, log.procedure_name);
    counts[key] = (counts[key] || 0) + Number(log.count_done || 0);
  }
  return counts;
}
export function withLoggedProgress(quotas, logs) {
  const counts = countLoggedProcedures(logs);
  return quotas.map((quota) => ({
    ...quota,
    completed_count: Math.max(
      Number(quota.completed_count || 0),
      counts[quotaKey(quota.section_name, quota.task_name)] || 0,
    ),
  }));
}
