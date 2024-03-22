let runningActions: string[] = [];

export const isActionRunning = (id: string) => runningActions.includes(id);
export const addRunningAction = (id: string) => runningActions.push(id);
export const removeRunningAction = (id: string) =>
  (runningActions = runningActions.filter((it) => it !== id));
