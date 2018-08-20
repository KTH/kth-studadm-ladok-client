import { RequestPromiseOptions } from 'request-promise-native'
import { CookieJar } from 'request'

export interface Link {
  rel: string
  method: string
  uri: string
}

export class LadokApiError extends Error {

  constructor (message: string, public status?: number) {
    super(message)
  }
}

export function serviceForRel (rel: string): string {
  let match = rel.match(/http:\/\/relations.ladok.se\/([^/]+)\/.*/)
  if (!match) {
    throw new LadokApiError('unable to determine ladok service from rel: ' + rel)
  }
  return match[1]
}

export function serviceForUri (uri: string): string {
  const match = uri.match(new RegExp('https?://.*?/(.*?)/.*'))
  if (!match) {
    throw new LadokApiError('unable to parse service name from string:' + uri)
  }
  return match[1]
}

export function defaultContentTypeForService (serviceName: string) {
  return `application/vnd.ladok-${serviceName}+json`
}

export function findLink (links: Link[], rel: string, method: string = 'GET') {
  if (!links) throw new LadokApiError('argument links is required')
  if (!rel) throw new LadokApiError('argument rel is required')
  const result = links.filter(link => link.rel === rel && link.method === method).pop()
  if (!result) {
    throw new LadokApiError('link not found for ' + rel + ', ' + method)
  }
  return result
}

export interface GetDeleteHeaders {
  Accept: string,
  [key: string]: string
}

export function createRequestHeadersForIndex (service: string) {
  return {
    Accept: defaultContentTypeForService(service)
  }
}

export function createRequestHeadersForLink (link: Link, headers: {[key: string]: string} = {}): GetDeleteHeaders {
  if (link.method === 'GET' || link.method === 'DELETE') {
    return {
      Accept: headers.Accept || defaultContentTypeForService(serviceForUri(link.uri)),
      ...headers
    }
  } else if (link.method === 'POST' || link.method === 'PUT') {
    return {
      Accept: headers.Accept || defaultContentTypeForService(serviceForUri(link.uri)),
      'Content-Type': headers['Content-Type'] || defaultContentTypeForService(serviceForUri(link.uri)),
      ...headers
    }
  } else {
    throw new LadokApiError('unsupported http method ' + link.method)
  }
}

export interface OptionsFactory {
  createRequestOptions (link: Link, headers: any, requestOptions: RequestPromiseOptions): RequestPromiseOptions
  createGetOptionsForService (service: string, requestOptions: RequestPromiseOptions): RequestPromiseOptions
  createPutOrPostOptions (link: Link, body: any, headers: any, requestOptions: RequestPromiseOptions): RequestPromiseOptions
}

export function createOptionsFactory (cookieJar: CookieJar | boolean, agentOptions: any): OptionsFactory {
  function createRequestOptions (link: Link, headers: any, requestOptions: RequestPromiseOptions) {
    return {
      ...requestOptions,
      jar: cookieJar,
      agentOptions: agentOptions,
      headers: createRequestHeadersForLink(link, headers)
    }
  }

  function createGetOptionsForService (service: string, requestOptions: RequestPromiseOptions) {
    return {
      ...requestOptions,
      jar: cookieJar,
      agentOptions: agentOptions,
      headers: createRequestHeadersForIndex(service)
    }
  }

  function createPutOrPostOptions (link: Link, body: any, headers: any, requestOptions: RequestPromiseOptions) {
    const optionsForGet = createRequestOptions(link, headers, requestOptions)
    return {
      ...optionsForGet,
      body: JSON.stringify(body)
    }
  }

  return {
    createRequestOptions,
    createGetOptionsForService,
    createPutOrPostOptions
  }
}
