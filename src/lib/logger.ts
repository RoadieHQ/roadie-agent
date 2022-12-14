import pino, { BaseLogger } from 'pino';

const rootLogger = pino();
const childLoggers = new Map<string, pino.BaseLogger>();
export const getRootLogger = () => {
  return rootLogger;
};

export const getLogger = (id: string): BaseLogger => {
  if (childLoggers.has(id)) {
    return childLoggers.get(id)!;
  }
  const childLogger = rootLogger.child({ label: id });
  childLoggers.set(id, childLogger);
  return childLogger;
};
