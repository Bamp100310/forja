import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  resolveForjaBaseUrl,
  isForjaServiceWorkerRegistration,
  isForjaLegacyCache,
  retireLegacyServiceWorkersAndCaches,
  isUserInteractingWithForm,
  setupChunkLoadRecovery,
} from './pwaMigration'

describe('FORJA III — PWA & Legacy Service Worker Migration (Section 6)', () => {
  const origin = 'https://operario.github.io'
  const appBaseUrl = resolveForjaBaseUrl(origin, '/forja/')

  beforeEach(() => {
    window.sessionStorage.clear()
    document.body.innerHTML = ''
  })

  it('resolves the canonical FORJA base URL with trailing slash', () => {
    expect(appBaseUrl).toBe('https://operario.github.io/forja/')
    expect(resolveForjaBaseUrl(origin, '/forja')).toBe('https://operario.github.io/forja/')
  })

  it('identifies only FORJA Service Worker registrations and ignores other apps on the same origin', () => {
    const forjaReg = {
      scope: 'https://operario.github.io/forja/',
      active: { scriptURL: 'https://operario.github.io/forja/sw.js' } as ServiceWorker,
      waiting: null,
      installing: null,
    }
    const otherAppReg = {
      scope: 'https://operario.github.io/otra-app/',
      active: { scriptURL: 'https://operario.github.io/otra-app/sw.js' } as ServiceWorker,
      waiting: null,
      installing: null,
    }
    const rootAppReg = {
      scope: 'https://operario.github.io/',
      active: { scriptURL: 'https://operario.github.io/sw.js' } as ServiceWorker,
      waiting: null,
      installing: null,
    }

    expect(isForjaServiceWorkerRegistration(forjaReg, appBaseUrl)).toBe(true)
    expect(isForjaServiceWorkerRegistration(otherAppReg, appBaseUrl)).toBe(false)
    expect(isForjaServiceWorkerRegistration(rootAppReg, appBaseUrl)).toBe(false)
  })

  it('identifies only FORJA legacy caches and preserves caches from other apps on the same origin', async () => {
    // 1. Explicit FORJA or scoped Workbox cache -> true
    expect(
      await isForjaLegacyCache('workbox-precache-v2-https://operario.github.io/forja/', appBaseUrl),
    ).toBe(true)
    expect(await isForjaLegacyCache('forja-v2-assets', appBaseUrl)).toBe(true)

    // 2. Scoped Workbox cache for another app on the same origin -> false
    expect(
      await isForjaLegacyCache('workbox-precache-v2-https://operario.github.io/otra-app/', appBaseUrl),
    ).toBe(false)
    expect(await isForjaLegacyCache('otra-app-offline-v1', appBaseUrl)).toBe(false)

    // 3. Unscoped workbox cache: inspects cache keys to verify ownership
    const mockCacheStorageForjaOnly = {
      open: vi.fn().mockResolvedValue({
        keys: vi.fn().mockResolvedValue([
          { url: 'https://operario.github.io/forja/index.html' },
          { url: 'https://operario.github.io/forja/assets/index-abc123.js' },
        ]),
      }),
    } as unknown as CacheStorage

    const mockCacheStorageOtherApp = {
      open: vi.fn().mockResolvedValue({
        keys: vi.fn().mockResolvedValue([
          { url: 'https://operario.github.io/otra-app/index.html' },
        ]),
      }),
    } as unknown as CacheStorage

    expect(
      await isForjaLegacyCache('workbox-precache-v2', appBaseUrl, mockCacheStorageForjaOnly),
    ).toBe(true)
    expect(
      await isForjaLegacyCache('workbox-precache-v2', appBaseUrl, mockCacheStorageOtherApp),
    ).toBe(false)
  })

  it('retires FORJA registrations and caches without touching other apps on the origin', async () => {
    const unregisterForja = vi.fn().mockResolvedValue(true)
    const unregisterOther = vi.fn().mockResolvedValue(true)

    const mockSwContainer = {
      getRegistrations: vi.fn().mockResolvedValue([
        {
          scope: 'https://operario.github.io/forja/',
          active: { scriptURL: 'https://operario.github.io/forja/sw.js' },
          waiting: null,
          installing: null,
          unregister: unregisterForja,
        },
        {
          scope: 'https://operario.github.io/portafolio/',
          active: { scriptURL: 'https://operario.github.io/portafolio/sw.js' },
          waiting: null,
          installing: null,
          unregister: unregisterOther,
        },
      ]),
    }

    const deletedSet = new Set<string>()
    const mockCacheStorage = {
      keys: vi
        .fn()
        .mockResolvedValue([
          'workbox-precache-v2-https://operario.github.io/forja/',
          'forja-runtime-cache',
          'workbox-precache-v2-https://operario.github.io/portafolio/',
          'portafolio-images-v1',
        ]),
      delete: vi.fn().mockImplementation(async (name: string) => {
        deletedSet.add(name)
        return true
      }),
      open: vi.fn(),
    } as unknown as CacheStorage

    const result = await retireLegacyServiceWorkersAndCaches({
      appBaseUrl,
      serviceWorkerContainer: mockSwContainer as unknown as Pick<
        ServiceWorkerContainer,
        'getRegistrations'
      >,
      cacheStorage: mockCacheStorage,
    })

    expect(unregisterForja).toHaveBeenCalledTimes(1)
    expect(unregisterOther).not.toHaveBeenCalled()
    expect(result.unregisteredCount).toBe(1)
    expect(result.deletedCaches).toEqual([
      'workbox-precache-v2-https://operario.github.io/forja/',
      'forja-runtime-cache',
    ])
    expect(result.preservedCaches).toEqual([
      'workbox-precache-v2-https://operario.github.io/portafolio/',
      'portafolio-images-v1',
    ])
  })

  it('prevents automatic chunk reload when the user is interacting with a financial form or modal', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    expect(isUserInteractingWithForm(document)).toBe(true)

    input.blur()
    expect(isUserInteractingWithForm(document)).toBe(false)

    const modal = document.createElement('div')
    modal.className = 'forge-modal-box'
    document.body.appendChild(modal)
    expect(isUserInteractingWithForm(document)).toBe(true)
  })

  it('guards chunk preload error reload with session cooldown to prevent reload loops', () => {
    const reloadSpy = vi.fn()
    const fakeWin = {
      document,
      sessionStorage: window.sessionStorage,
      location: { reload: reloadSpy },
      addEventListener: window.addEventListener.bind(window),
      removeEventListener: window.removeEventListener.bind(window),
    } as unknown as Window

    const cleanup = setupChunkLoadRecovery(fakeWin)

    // First preload error triggers reload
    window.dispatchEvent(new Event('vite:preloadError'))
    expect(reloadSpy).toHaveBeenCalledTimes(1)

    // Immediate second preload error is blocked by cooldown
    window.dispatchEvent(new Event('vite:preloadError'))
    expect(reloadSpy).toHaveBeenCalledTimes(1)

    cleanup()
  })
})
