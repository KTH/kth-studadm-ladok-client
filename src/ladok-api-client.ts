import url from 'url'
import {createOptionsFactory, findLink, LadokApiError, Link, serviceForRel} from './utils'

import got, {GotOptions} from 'got'
import {CookieJar} from 'tough-cookie'

export interface LadokApiClientConfig {
    baseUrl: string,
    pfx: Buffer,
    passphrase: string
    retry: number
    json: boolean
}

export interface FollowOptions {
    queryParams?: any,
    body?: any,
    requestOptions?: GotOptions<null>,
    headers?: {
        [key: string]: string
    }
}

export interface LadokApiClient {
    findIndexLink(rel: string, method?: string): Promise<Link>

    findLink(links: Link[], rel: string, method?: string): Link

    createLinkFromPath(path: string, method?: string): Link

    followLink(link: Link, options?: FollowOptions): Promise<any>

    statusForService(service: string): Promise<boolean>
}

function parseJSON(response: string) {
    return JSON.parse(response)
}

export function createLadokApiClient(config: LadokApiClientConfig): LadokApiClient {
    const cookieJar = new CookieJar()
    const optionsFactory = createOptionsFactory(cookieJar,config)
    const linkIndex = new Map()

    const ladokGot = got

    console.log(config)

    async function fetchIndexForService(service: string, requestOptions?: GotOptions<string>) {
        try {
            if (!service) throw new LadokApiError('argument service is required')
            const url = `${config.baseUrl}/${service}/service/index`
            let getOptions: GotOptions<any> = optionsFactory.createGetOptionsForService(service, requestOptions || {})
            console.log(getOptions, url, config)
            return got.get(url, getOptions).then(resp => resp.body)
        } catch (error) {
            console.log(`Error in fetchIndexForService: ${error.toString()}`)
            throw error
        }
    }

    async function getIndexLinksForService(service: string) {

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

    async function findIndexLink(rel: string, method: string = 'GET') {
        return findLink(await getIndexLinksForService(serviceForRel(rel)), rel, method)
    }

    function createLinkFromPath(path: string, method: string = 'GET'): Link {
        return {
            uri: config.baseUrl + path,
            rel: 'http://relations.ladok.se' + path,
            method
        }
    }

    async function followLink(link: Link, followOptions?: FollowOptions) {
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
            return (await got.get(url.format(urlObj), getOptionbs) as any).body
        } else if (link.method === 'PUT') {
            let putOptions = optionsFactory.createPutOrPostOptions(link, body, headers, requestOptions)
            return (await got.put(url.format(urlObj), putOptions) as any).body
        } else if (link.method === 'POST') {
            let postOptions = optionsFactory.createPutOrPostOptions(link, body, headers, requestOptions)
            return (await got.post(url.format(urlObj), postOptions) as any).body
        } else if (link.method === 'DELETE') {
            let deleteOptions = optionsFactory.createRequestOptions(link, headers, requestOptions)
            return parseJSON(await got.delete(url.format(urlObj), deleteOptions) as any).body.toJSON()
        } else {
            throw new Error('unsupported method ' + link.method)
        }
    }

    function statusForService(service: string) {
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
