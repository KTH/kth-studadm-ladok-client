import request from 'request-promise-native'
import url from 'url'
import { defaultContentTypeForService, findLink, LadokApiError, Link, serviceForRel, serviceForUri } from './utils'

export interface LadokApiClientConfig {
  baseUrl: string,
  sslOptions: {
    pfx: any,
    passphrase: string
  }
}

export interface FollowOptions {
  queryParams?: any,
  body?: any,
  headers?: any
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

export function createLadokApiClient ({ baseUrl, sslOptions }: LadokApiClientConfig): LadokApiClient {
  const cookieJar = request.jar()

  function createGetOptionsForService (service: string, headers?: any) {
    return {
      jar: cookieJar,
      agentOptions: sslOptions,
      headers: {
        Accept: defaultContentTypeForService(service),
        ...headers
      }
    }
  }

  function createGetOrDeleteOptions (link: Link, headers?: any) {
    return createGetOptionsForService(serviceForUri(link.uri), headers)
  }

  function createPutOrPostOptions (link: Link, body: any, headers?: any) {
    let optionsForGet = createGetOrDeleteOptions(link, headers)
    return {
      ...optionsForGet,
      body: JSON.stringify(body),
      headers: {
        'Content-Type': optionsForGet.headers.Accept,
        ...optionsForGet.headers
      }
    }
  }

  const linkIndex = new Map()

  async function fetchIndexForService (service: string) {
    if (!service) throw new LadokApiError('argument service is required')
    const url = `${baseUrl}/${service}/service/index`
    return parseJSON(await request.get(url, createGetOptionsForService(service)).promise())
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
      rel: 'http://relations.ladok.se' + path,
      method
    }
  }

  async function followLink (link: Link, followOptions?: FollowOptions) {
    if (!link) throw new LadokApiError('argument link is required')
    const urlObj = url.parse(link.uri, true)

    if (followOptions && followOptions.queryParams) {
      Object.assign(urlObj.query, followOptions.queryParams)
    }
    const body = followOptions && followOptions.body || {}
    if (link.method === 'GET') {
      return parseJSON(await request.get(url.format(urlObj), createGetOrDeleteOptions(link)).promise())
    } else if (link.method === 'PUT') {
      return parseJSON(await request.put(url.format(urlObj), createPutOrPostOptions(link, body)).promise())
    } else if (link.method === 'POST') {
      return parseJSON(await request.post(url.format(urlObj), createPutOrPostOptions(link, body)).promise())
    } else if (link.method === 'DELETE') {
      return parseJSON(await request.put(url.format(urlObj), createGetOrDeleteOptions(link)).promise())
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
