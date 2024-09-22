import {
  OzmaDBError,
  IEntityRef,
  ClientApiError,
} from '@ozma-io/ozmadb-js/client'

export const apiUrl = window.API_URL || __API_URL__
export const documentGeneratorUrl =
  window.DOCUMENT_GENERATOR_URL || __DOCUMENT_GENERATOR_URL__
export const invitesServiceUrl =
  window.INVITES_SERVICE_URL || __INVITES_SERVICE_URL__
export const developmentMode = Boolean(
  window.DEVELOPMENT_MODE || __DEVELOPMENT_MODE__,
)
export const instanceName = window.INSTANCE_NAME || __INSTANCE_NAME__
const authUrlBase = window.API_AUTH_URL || __API_AUTH_URL__
export const authUrl = authUrlBase
  ? `${authUrlBase}/protocol/openid-connect`
  : undefined
export const accountUrl = authUrlBase ? `${authUrlBase}/account` : undefined
export const authClientId = window.AUTH_CLIENT_ID || __AUTH_CLIENT_ID__

if (authUrlBase && !authClientId) {
  throw new Error('Invalid auth configuration')
}

export const ozmaSchema = 'ozma'

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
  if (e instanceof OzmaDBError) {
    return findErrorInfoUserData(e.body)
  } else {
    return undefined
  }
}

export type IDocumentRef = IEntityRef
export type IEmbeddedPageRef = IEntityRef
export type IIframeRef = IEntityRef
