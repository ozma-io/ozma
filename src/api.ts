import FunDBAPI from "ozma-api";

const hostnameParts = location.hostname.split(".");
export const instanceName = (typeof __INSTANCE_NAME__ === "string") ? String(__INSTANCE_NAME__) : hostnameParts[0];
export const instancesHost = hostnameParts.length >= 2 ? hostnameParts[hostnameParts.length - 2] + "." + hostnameParts[hostnameParts.length - 1] : null;
const apiUrl = String(__API_URL__);
export const documentGeneratorUrl = String(__DOCUMENT_GENERATOR_URL__);
export const developmentMode = Boolean(__DEVELOPMENT_MODE__);
export const disableAuth = Boolean(__DISABLE_AUTH__);
const readonlyDemoInstanceName = typeof __READ_ONLY_INSTANCE_NAME__ === "string" ? __READ_ONLY_INSTANCE_NAME__ : undefined;
export const isReadonlyDemoInstance = instanceName === readonlyDemoInstanceName;

export const authOrigin = String(__API_AUTH_URL__);
export const authUrlBase = `${authOrigin}${String(__API_AUTH_URL_BASE__)}`;
export const authUrl = `${authUrlBase}/protocol/openid-connect`;
export const accountUrl = `${authUrlBase}/account`;
export const authClientId = String(__AUTH_CLIENT_ID__);

if (!disableAuth && !(__API_AUTH_URL__ && __API_AUTH_URL_BASE__ && __AUTH_CLIENT_ID__)) {
  throw new Error("Invalid auth configuration");
}

export const funappSchema = "funapp";

const api = new FunDBAPI({ apiUrl });
export default api;
