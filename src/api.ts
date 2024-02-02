import { FunDBError, IEntityRef, ClientApiError } from 'ozma-api'

const hostnameParts = location.hostname.split('.')
export const instanceName =
  typeof __INSTANCE_NAME__ === 'string'
    ? String(__INSTANCE_NAME__)
    : hostnameParts[0]
export const instancesHost =
  hostnameParts.length >= 2
    ? hostnameParts[hostnameParts.length - 2] +
      '.' +
      hostnameParts[hostnameParts.length - 1]
    : null
export const apiUrl = String(__API_URL__)
export const documentGeneratorUrl = String(__DOCUMENT_GENERATOR_URL__)
export const invitesServiceUrl =
  typeof __INVITES_SERVICE_URL__ === 'string'
    ? __INVITES_SERVICE_URL__
    : undefined
export const developmentMode = Boolean(__DEVELOPMENT_MODE__)
export const disableAuth = Boolean(__DISABLE_AUTH__)

export const authOrigin = String(__API_AUTH_URL__)
export const authUrlBase = `${authOrigin}${String(__API_AUTH_URL_BASE__)}`
export const authUrl = `${authUrlBase}/protocol/openid-connect`
export const accountUrl = `${authUrlBase}/account`
export const authClientId = String(__AUTH_CLIENT_ID__)

if (
  !disableAuth &&
  !(__API_AUTH_URL__ && __API_AUTH_URL_BASE__ && __AUTH_CLIENT_ID__)
) {
  throw new Error('Invalid auth configuration')
}

export const funappSchema = 'funapp'

const findErrorInfoUserData = (e: ClientApiError): unknown => {
  if (e.error === 'exception') {
    return e.userData
  } else if (e.error === 'trigger') {
    return findErrorInfoUserData(e.inner)
  } else if (e.error === 'transaction') {
    return findErrorInfoUserData(e.inner)
  } else {
    return undefined
  }
}

export const findErrorUserData = (e: Error): unknown => {
  if (e instanceof FunDBError) {
    return findErrorInfoUserData(e.body)
  } else {
    return undefined
  }
}

export type IDocumentRef = IEntityRef
export type IEmbeddedPageRef = IEntityRef
export type IIframeRef = IEntityRef
