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
