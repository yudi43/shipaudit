import type { AuditReport } from './types'
import { reportView } from './report-view'

export type SavedAudit = { key: string; report: AuditReport; savedAt: string }
export const HISTORY_LIMIT = 50
const DATABASE = 'shipaudit-history'
const STORE = 'audits'
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Browser storage unavailable'))
      return
    }
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: 'key' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () =>
      reject(new Error('Close other ShipAudit tabs and try again'))
  })
}
function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
function complete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}
export async function listHistory(): Promise<SavedAudit[]> {
  const db = await openDatabase()
  try {
    const records = (await result(
      db.transaction(STORE).objectStore(STORE).getAll(),
    )) as SavedAudit[]
    return records.sort((a, b) =>
      b.report.createdAt.localeCompare(a.report.createdAt),
    )
  } finally {
    db.close()
  }
}
export async function getSavedAudit(
  key: string,
): Promise<SavedAudit | undefined> {
  const db = await openDatabase()
  try {
    return await result(db.transaction(STORE).objectStore(STORE).get(key))
  } finally {
    db.close()
  }
}
export async function saveAudit(report: AuditReport): Promise<string> {
  if (
    report.id === 'demo' ||
    report.dataVersion !== 2 ||
    reportView(report).invalid
  )
    throw new Error('Only measured reports can be saved')
  const createdAt = Date.parse(report.createdAt)
  if (!Number.isFinite(createdAt)) throw new Error('Invalid report timestamp')
  const key = `${report.id}-${createdAt}`
  const db = await openDatabase()
  try {
    // Read, write, and prune in one transaction so concurrent tabs cannot
    // independently read the same old list and exceed the retention limit.
    const transaction = db.transaction(STORE, 'readwrite')
    const done = complete(transaction)
    const store = transaction.objectStore(STORE)
    const read = store.getAll()
    read.onsuccess = () => {
      const saved = { key, report, savedAt: new Date().toISOString() }
      const sorted = [
        ...(read.result as SavedAudit[]).filter((a) => a.key !== key),
        saved,
      ].sort((a, b) => b.report.createdAt.localeCompare(a.report.createdAt))
      store.put(saved)
      for (const old of sorted.slice(HISTORY_LIMIT)) store.delete(old.key)
    }
    await done
    return key
  } finally {
    db.close()
  }
}
export async function removeSavedAudit(key: string): Promise<void> {
  const db = await openDatabase()
  try {
    const transaction = db.transaction(STORE, 'readwrite')
    const done = complete(transaction)
    transaction.objectStore(STORE).delete(key)
    await done
  } finally {
    db.close()
  }
}
export async function clearHistory(): Promise<void> {
  const db = await openDatabase()
  try {
    const transaction = db.transaction(STORE, 'readwrite')
    const done = complete(transaction)
    transaction.objectStore(STORE).clear()
    await done
  } finally {
    db.close()
  }
}
