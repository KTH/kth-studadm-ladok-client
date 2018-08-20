import request, { RequestPromiseOptions } from 'request-promise-native'
import url from 'url'
import {
  createOptionsFactory,
  findLink,
  LadokApiError,
  Link,
  serviceForRel
} from './utils'

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
  requestOptions?: RequestPromiseOptions,
  headers?: {
    [key: string]: string
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

export function createLadokApiClient ({ baseUrl, sslOptions }: LadokApiClientConfig): LadokApiClient {
  const cookieJar = request.jar()
  const optionsFactory = createOptionsFactory(cookieJar, sslOptions)
  const linkIndex = new Map()

  async function fetchIndexForService (service: string, requestOptions?: RequestPromiseOptions) {
    if (!service) throw new LadokApiError('argument service is required')
    const url = `${baseUrl}/${service}/service/index`
    let getOptions = optionsFactory.createGetOptionsForService(service, requestOptions || {})
    return parseJSON(await request.get(url, getOptions).promise())
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
    const headers = followOptions && followOptions.headers || {}
    const requestOptions = followOptions && followOptions.requestOptions || {}
    if (link.method === 'GET') {
      let getOptionbs = optionsFactory.createRequestOptions(link, headers, requestOptions)
      return parseJSON(await request.get(url.format(urlObj), getOptionbs).promise())
    } else if (link.method === 'PUT') {
      let putOptions = optionsFactory.createPutOrPostOptions(link, body, headers, requestOptions)
      return parseJSON(await request.put(url.format(urlObj), putOptions).promise())
    } else if (link.method === 'POST') {
      let postOptions = optionsFactory.createPutOrPostOptions(link, body, headers, requestOptions)
      return parseJSON(await request.post(url.format(urlObj), postOptions).promise())
    } else if (link.method === 'DELETE') {
      let deleteOptions = optionsFactory.createRequestOptions(link, headers, requestOptions)
      return parseJSON(await request.put(url.format(urlObj), deleteOptions).promise())
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
