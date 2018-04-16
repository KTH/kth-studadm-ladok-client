import request from 'request-promise-native'
import url from 'url'

export interface LadokApiClientConfig {
  baseUrl: string,
  sslOptions: {
    pfx: any,
    passphrase: string
  }
}

export interface Link {
  rel: string
  method: string
  uri: string
}

export interface FollowOptions {
  queryParams?: any
}

export class LadokApiError extends Error {

  constructor (message: string, public status?: number) {
    super(message)
  }
}

export interface LadokApiClient {
  findIndexLink (rel: string, method?: string): Promise<Link>

  findLink (links: Link[], rel: string, method?: string): Link

  createLinkFromPath (path: string, method?: string): Link

  followLink (link: Link, options?: FollowOptions): Promise<any>

  statusForService (service: string): Promise<boolean>
}

function parseJSON (response: string) {
  return JSON.parse(response)
}

function serviceForRel (rel: string) {
  let match = rel.match(/http:\/\/relations.ladok.se\/([^/]+)\/.*/)
  if (!match) {
    throw new LadokApiError('unable to parse relation string: ' + rel)
  }
  return match[1]
}

function findLink (links: Link[], rel: string, method: string = 'GET') {
  if (!links) throw new LadokApiError('argument links is required')
  if (!rel) throw new LadokApiError('argument rel is required')
  const result = links.filter(link => link.rel === rel && link.method === method).pop()
  if (!result) {
    throw new LadokApiError('link not found for ' + rel + ', ' + method)
  }
  return result
}

export function createLadokApiClient ({ baseUrl, sslOptions }: LadokApiClientConfig): LadokApiClient {
  const cookieJar = request.jar()
  const options = {
    jar: cookieJar,
    headers: {
      Accept: 'application/vnd.ladok-kataloginformation+json, application/vnd.ladok-utbildningsinformation+json, application/vnd.ladok-resultat+json, application/vnd.ladok-studiedeltagande+json'
    },

    agentOptions: sslOptions
  }

  const linkIndex = new Map()

  async function fetchIndexForService (service: string) {
    if (!service) throw new LadokApiError('argument service is required')
    const url = `${baseUrl}/${service}/service/index`
    return parseJSON(await request.get(url, options))
  }

  async function getIndexLinksForService (service: string) {
    if (!service) throw new LadokApiError('argument service is required')
    if (linkIndex.has(service)) {
      return linkIndex.get(service)
    } else {
      const serviceIndex = await fetchIndexForService(service)
      const links = serviceIndex.link
      linkIndex.set(service, links)
      return links
    }
  }

  async function findIndexLink (rel: string, method: string = 'GET') {
    return findLink(await getIndexLinksForService(serviceForRel(rel)), rel, method)
  }

  function createLinkFromPath (path: string, method: string = 'GET'): Link {
    return {
      uri: baseUrl + path,
      rel: '',
      method
    }
  }

  async function followLink (link: Link, followOptions?: FollowOptions) {
    if (!link) throw new LadokApiError('argument link is required')
    const urlObj = url.parse(link.uri, true)

    if (followOptions && followOptions.queryParams) {
      Object.assign(urlObj.query, followOptions.queryParams)
    }
    if (link.method === 'GET') {
      return parseJSON(await request.get(url.format(urlObj), options))
    } else {
      throw new Error('unsupported method ' + link.method)
    }
  }

  function statusForService (service: string) {
    if (!service) throw new LadokApiError('argument service is required')
    return fetchIndexForService(service)
      .then(response => true)
      .catch(_ => false)
  }

  return {
    findIndexLink: findIndexLink,
    createLinkFromPath,
    followLink: followLink,
    findLink: findLink,
    statusForService
  }
}
