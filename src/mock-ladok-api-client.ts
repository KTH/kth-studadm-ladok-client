import { FollowOptions, LadokApiClient } from './ladok-api-client'
import { LadokApiError, Link } from './utils'

export type LadokResponder<T> = (input: { followOptions: FollowOptions, link: Link }) => Promise<T>

type LinkMatcher = (link: Link) => boolean

export class MockLadokApi implements LadokApiClient {
  private linkReponses: { matches: LinkMatcher, responder: LadokResponder<any> }[] = []

  respondOnRel<T> (rel: string, responder: LadokResponder<T>): void {
    const matches = (link: Link) => link.rel === rel
    this.linkReponses.push({ responder, matches })
  }

  respondOnLink<T> (link: Link, responder: LadokResponder<T>): void {
    const matches = (candidate: Link) => link.uri === candidate.uri &&
      link.method === candidate.method && link.rel === candidate.rel
    this.linkReponses.push({ matches, responder })
  }

  respondOnRelWith<T> (rel: string, response: T): void {
    this.respondOnRel(rel, () => Promise.resolve(response))
  }

  findIndexLink (rel: string, method?: string): Promise<Link> {
    return Promise.resolve({ uri: '', rel, method: method || 'GET' })
  }

  findLink (links: Link[], rel: string, method: string = 'GET'): Link {
    let link = links.filter(link => link.rel === rel && link.method === method).pop()
    if (!link) {
      throw new LadokApiError('unable to find ' + rel)
    }
    return link
  }

  followLink (link: Link, options: FollowOptions = {}): Promise<any> {
    const linkResponder = this.linkReponses.filter(linkResponse => linkResponse.matches(link))
      .map(linkResponse => linkResponse.responder)
      .pop()
    if (linkResponder) {
      return linkResponder({ followOptions: options, link: link })
    } else {
      return Promise.reject({})
    }
  }

  statusForService (service: string, required?: boolean): Promise<boolean> {
    return Promise.resolve(true)
  }

  createLinkFromPath (path: string, method: string = 'GET'): Link {
    return {
      uri: path,
      rel: 'http://relations.ladok.se' + path,
      method
    }
  }
}
