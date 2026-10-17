/**
 * FORJA III — Retirada controlada y segura de Service Workers heredados y cachés propias.
 *
 * Principios de seguridad (Sección 6):
 * 1. FORJA III no registra ni genera Service Workers ni mantiene caché offline propia.
 * 2. En orígenes compartidos (como GitHub Pages: https://<usuario>.github.io/<repo>/),
 *    NUNCA se deben desregistrar workers ni borrar cachés pertenecientes a otras aplicaciones.
 * 3. Solo se retiran registros cuyo `scope` o `scriptURL` corresponda verificablemente a FORJA.
 * 4. Solo se eliminan entradas de `CacheStorage` identificadas verificablemente como propias de FORJA.
 * 5. No se altera `localStorage`, `sessionStorage` de sesión ni `IndexedDB` para preservar la autenticación.
 */

const CHUNK_RECOVERY_STORAGE_KEY = 'forja_iii_chunk_recovery_ts'
const CHUNK_RECOVERY_COOLDOWN_MS = 60_000

/**
 * Resuelve la URL base absoluta de la aplicación FORJA (ej. `https://usuario.github.io/forja/`).
 */
export function resolveForjaBaseUrl(
  origin: string = typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
  basePath: string = import.meta.env.BASE_URL || '/forja/',
): string {
  try {
    const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`
    return new URL(normalizedBase, origin).href
  } catch {
    return `${origin}/forja/`
  }
}

/**
 * Determina si un ServiceWorkerRegistration pertenece verificablemente al ámbito de FORJA.
 */
export function isForjaServiceWorkerRegistration(
  registration: Pick<ServiceWorkerRegistration, 'scope' | 'active' | 'waiting' | 'installing'>,
  appBaseUrl: string,
): boolean {
  const scope = registration.scope || ''
  const normalizedAppBase = appBaseUrl.endsWith('/') ? appBaseUrl : `${appBaseUrl}/`
  const normalizedAppBaseNoSlash = normalizedAppBase.slice(0, -1)

  if (scope === normalizedAppBase || scope === normalizedAppBaseNoSlash || scope.startsWith(normalizedAppBase)) {
    return true
  }

  try {
    const scopePath = new URL(scope).pathname
    if (scopePath === '/forja/' || scopePath === '/forja' || scopePath.startsWith('/forja/')) {
      return true
    }
  } catch {
    if (scope.includes('/forja/') || scope.endsWith('/forja')) {
      return true
    }
  }

  const scriptUrls = [
    registration.active?.scriptURL,
    registration.waiting?.scriptURL,
    registration.installing?.scriptURL,
  ].filter((url): url is string => Boolean(url))

  return scriptUrls.some(
    (url) =>
      url.startsWith(normalizedAppBase) ||
      url.includes('/forja/sw.js') ||
      url.includes('/forja/registerSW.js') ||
      url.includes('/forja/service-worker.js'),
  )
}

/**
 * Determina si una caché en CacheStorage pertenece verificablemente a FORJA / Workbox de FORJA.
 * Nunca marca cachés de otras aplicaciones alojadas en el mismo origen.
 */
export async function isForjaLegacyCache(
  cacheName: string,
  appBaseUrl: string,
  cacheStorage?: CacheStorage,
): Promise<boolean> {
  const trimmed = cacheName.trim()
  if (!trimmed) return false

  const lower = trimmed.toLowerCase()
  const normalizedAppBase = appBaseUrl.endsWith('/') ? appBaseUrl : `${appBaseUrl}/`
  const normalizedAppBaseNoSlash = normalizedAppBase.slice(0, -1)

  // 1. Nombre explícito de FORJA o que incluye el scope exacto de FORJA
  if (
    lower.startsWith('forja-') ||
    lower.startsWith('forja_') ||
    lower === 'forja' ||
    trimmed.includes(normalizedAppBase) ||
    trimmed.includes(normalizedAppBaseNoSlash) ||
    lower.includes('/forja/')
  ) {
    return true
  }

  // 2. Cachés de Workbox: verificar si contienen otro scope o si sus entradas son exclusivamente de FORJA
  if (lower.startsWith('workbox-precache') || lower.startsWith('workbox-runtime') || lower.startsWith('vite-pwa')) {
    // Si incluye una URL explícita que NO es la de FORJA, pertenece a otra app del mismo origen
    if (lower.includes('http://') || lower.includes('https://')) {
      return false
    }

    // Si no tiene URL en el nombre, inspeccionamos las claves almacenadas antes de decidir
    if (cacheStorage) {
      try {
        const cache = await cacheStorage.open(trimmed)
        const requests = await cache.keys()
        if (requests.length === 0) {
          return false
        }
        return requests.every(
          (req) => req.url.startsWith(normalizedAppBase) || req.url.includes('/forja/'),
        )
      } catch {
        return false
      }
    }
  }

  return false
}

export interface LegacySwRetirementResult {
  unregisteredCount: number
  deletedCaches: string[]
  preservedCaches: string[]
}

/**
 * Ejecuta la retirada segura y acotada de Service Workers y cachés heredadas de FORJA.
 */
export async function retireLegacyServiceWorkersAndCaches(options?: {
  appBaseUrl?: string
  serviceWorkerContainer?: Pick<ServiceWorkerContainer, 'getRegistrations'>
  cacheStorage?: CacheStorage
}): Promise<LegacySwRetirementResult> {
  const appBaseUrl = options?.appBaseUrl ?? resolveForjaBaseUrl()
  const swContainer =
    options?.serviceWorkerContainer ??
    (typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? navigator.serviceWorker : undefined)
  const cacheStorage =
    options?.cacheStorage ??
    (typeof window !== 'undefined' && 'caches' in window ? window.caches : undefined)

  let unregisteredCount = 0
  const deletedCaches: string[] = []
  const preservedCaches: string[] = []

  if (swContainer && typeof swContainer.getRegistrations === 'function') {
    try {
      const registrations = await swContainer.getRegistrations()
      for (const registration of registrations) {
        if (isForjaServiceWorkerRegistration(registration, appBaseUrl)) {
          try {
            const ok = await registration.unregister()
            if (ok) unregisteredCount += 1
          } catch {
            // Ignorar errores individuales de desregistro sin bloquear el arranque
          }
        }
      }
    } catch {
      // Ignorar si el navegador restringe el acceso a ServiceWorkerContainer
    }
  }

  if (cacheStorage && typeof cacheStorage.keys === 'function') {
    try {
      const cacheNames = await cacheStorage.keys()
      for (const name of cacheNames) {
        const belongsToForja = await isForjaLegacyCache(name, appBaseUrl, cacheStorage)
        if (belongsToForja) {
          try {
            const deleted = await cacheStorage.delete(name)
            if (deleted) deletedCaches.push(name)
          } catch {
            // Ignorar fallo individual de borrado
          }
        } else {
          preservedCaches.push(name)
        }
      }
    } catch {
      // Ignorar si CacheStorage está deshabilitado en el contexto actual
    }
  }

  return {
    unregisteredCount,
    deletedCaches,
    preservedCaches,
  }
}

/**
 * Comprueba si el usuario tiene un formulario o diálogo activo para evitar
 * que una recuperación de chunk interrumpa una operación financiera en curso.
 */
export function isUserInteractingWithForm(doc: Document = document): boolean {
  const active = doc.activeElement
  if (active) {
    const tag = active.tagName.toUpperCase()
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active.getAttribute('contenteditable') === 'true') {
      return true
    }
  }

  // Verificar si hay un modal o estación de trabajo abierta
  if (doc.querySelector('[role="dialog"], .forge-modal-box')) {
    return true
  }

  return false
}

/**
 * Gestiona de forma prudente errores de carga de módulos/chunks tras un nuevo despliegue,
 * evitando bucles de recarga y respetando cualquier formulario activo del usuario.
 */
export function setupChunkLoadRecovery(win: Window = window): () => void {
  const handlePreloadError = () => {
    try {
      if (isUserInteractingWithForm(win.document)) {
        // No forzar recarga mientras el usuario edita un formulario o modal financiero
        return
      }

      const now = Date.now()
      const lastReloadRaw = win.sessionStorage.getItem(CHUNK_RECOVERY_STORAGE_KEY)
      const lastReload = lastReloadRaw ? Number(lastReloadRaw) : 0

      if (!lastReload || Number.isNaN(lastReload) || now - lastReload > CHUNK_RECOVERY_COOLDOWN_MS) {
        win.sessionStorage.setItem(CHUNK_RECOVERY_STORAGE_KEY, String(now))
        win.location.reload()
      }
    } catch {
      // Si sessionStorage no está disponible, no forzar recarga automática para evitar bucles
    }
  }

  win.addEventListener('vite:preloadError', handlePreloadError as EventListener)
  return () => {
    win.removeEventListener('vite:preloadError', handlePreloadError as EventListener)
  }
}
