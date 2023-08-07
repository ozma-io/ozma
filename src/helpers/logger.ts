type Operand = keyof Pick<Console, "info" | "warn" | "error" | "debug">;

const { NODE_ENV } = process.env;

/**
 * @function Common function, which makes all the logging job. With Console as the inheritance type, it"s meant to work
 * in browser, but can be easily extended for anything else. Just hide some logs from the user.
 * @param Operand defines which logger level we are using, based on the most common Console methods
 * @param Content what are we trying to log. As we are using common loggers – type unknown, let the engine do his job
 * @returns void or null, just in case we need to find whether we could log smth or not
 */
const log = (operand: Operand, content: unknown): void | null => {
  const {
    // @ts-expect-error hidden inside features object, which is not usual Window object
    logLevels = [],
  } = window;
  const isLogEnabledByFeature = logLevels.includes(operand);
  const isLogEnabledByEnv = NODE_ENV === "development" || NODE_ENV === "test";

  if (isLogEnabledByEnv || isLogEnabledByFeature) {
    // eslint-disable-next-line no-console
    return console[operand](content);
  }

  return null;
};

export const logInfo = (data: unknown) => log("info", data);
export const logWarn = (data: unknown) => log("warn", data);
export const logError = (data: Error | unknown) => log("error", data);
export const logDebug = (data: unknown) => log("debug", data);
