import 'mocha'
import { expect } from 'chai'
import { defaultContentTypeForService, findLink, LadokApiError, Link, serviceForRel, serviceForUri } from './utils'

describe('utils', function () {
  describe('serviceForRel', function () {
    const relStudiedeltagande = 'http://relations.ladok.se/studiedeltagande/arel'
    const relResultat = 'http://relations.ladok.se/resultat/another/rel'
    const malformedRel = 'http://relations.malformed.se/malformed/rel'

    it('should return studiedeltagande', function () {
      expect(serviceForRel(relStudiedeltagande)).to.equal('studiedeltagande')
    })

    it('should return resultat', function () {
      expect(serviceForRel(relResultat)).to.equal('resultat')
    })

    it('should throw LadokApiError on malfomred', function () {
      expect(() => serviceForRel(malformedRel)).to.throw(LadokApiError)
    })

    it('should throw LadokApiError on self rel', function () {
      expect(() => serviceForRel('self')).to.throw(LadokApiError)
    })
  })

  describe('serviceForUri', function () {
    const utbildningsinformationUri = 'https://any.host.xx/utbildningsinformation/id/1234'
    const examenUri = 'http://other.host.se:443/examen/'
    const uriWithoutService = 'https://api.ladok.se:443/'

    it('should return utbildningsinformation', function () {
      expect(serviceForUri(utbildningsinformationUri)).to.equal('utbildningsinformation')
    })

    it('should return examen', function () {
      expect(serviceForUri(examenUri)).to.equal('examen')
    })

    it('should throw LadokApiError when service name is not there', function () {
      expect(() => serviceForUri(uriWithoutService)).to.throw(LadokApiError)
    })
  })

  describe('defaultContentTypeForService', function () {
    it('should return application/vnd.ladok-uppfoljning+json', function () {
      expect(defaultContentTypeForService('uppfoljning')).to.equal('application/vnd.ladok-uppfoljning+json')
    })
  })

  describe('findLink', function () {
    let rel1 = 'http://relations.ladok.se/resultat/rel1'
    let rel2 = 'http://relations.ladok.se/resultat/uri2'
    let relNotFound = 'http://relations.ladok.se/resultat/notfound'
    let uri1GET = 'http://a.se/resultat/uri1GET'
    let uri1POST = 'http://a.se/resultat/uri1POST'
    let uri2 = 'http://a.se/resultat/uri2'
    const links: Link[] = [
      { rel: rel1, uri: uri1GET, method: 'GET' },
      { rel: rel1, uri: uri1POST, method: 'POST' },
      { rel: rel2, uri: uri2, method: 'GET' }
    ]

    it('should find get link by default', function () {
      expect(findLink(links, rel1).uri).to.equal(uri1GET)
    })

    it('should find get link', function () {
      expect(findLink(links, rel1, 'GET').uri).to.equal(uri1GET)
    })

    it('should find post link', function () {
      expect(findLink(links, rel1, 'POST').uri).to.equal(uri1POST)
    })

    it('should find second uri', function () {
      expect(findLink(links, rel2, 'GET').uri).to.equal(uri2)
    })

    it('should throw a LadokApiError if the link is not found', function () {
      expect(() => findLink(links, relNotFound)).to.throw(LadokApiError)
    })
  })
})