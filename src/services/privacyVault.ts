const DATABASE_NAME = 'giplayer-library';
const DATABASE_VERSION = 2;
const VAULT_CONFIG_STORE = 'vault-config';
const VAULT_ITEMS_STORE = 'vault-items';
const VAULT_CHUNKS_STORE = 'vault-chunks';
const PIN_ITERATIONS = 310_000;
const CHUNK_SIZE = 2 * 1024 * 1024;
const CONFIG_KEY = 'config';

type VaultConfig = {
  pinSalt: ArrayBuffer;
  pinIv: Uint8Array;
  wrappedPinKey: ArrayBuffer;
  recoverySalt: ArrayBuffer;
  recoveryIv: Uint8Array;
  wrappedRecoveryKey: ArrayBuffer;
};

type EncryptedVaultItem = {
  id: string;
  metadataIv: Uint8Array;
  encryptedMetadata: ArrayBuffer;
  chunks: number;
};

export type VaultMediaInfo = {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  fingerprint: string;
  sourcePath: string;
  sourceId?: string;
};

export type DecryptedVaultMedia = VaultMediaInfo & { id: string };
export type VaultKey = CryptoKey;

export function getVaultMediaIdentity(sourceId: string | undefined, path: string, file: Pick<File, 'size' | 'lastModified'>): string {
  return sourceId ? `${sourceId}/${path}` : `${path}:${file.size}:${file.lastModified}`;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('handles')) database.createObjectStore('handles');
      if (!database.objectStoreNames.contains(VAULT_CONFIG_STORE)) database.createObjectStore(VAULT_CONFIG_STORE);
      if (!database.objectStoreNames.contains(VAULT_ITEMS_STORE)) database.createObjectStore(VAULT_ITEMS_STORE, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(VAULT_CHUNKS_STORE)) database.createObjectStore(VAULT_CHUNKS_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open private vault storage.'));
  });
}

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function validatePin(pin: string): void {
  if (!/^\d{4,6}$/.test(pin)) throw new Error('PIN must contain 4 to 6 digits.');
}

async function deriveWrappingKey(secret: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PIN_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function wrapKey(wrappingKey: CryptoKey, key: CryptoKey): Promise<{ iv: Uint8Array; data: ArrayBuffer }> {
  const raw = await crypto.subtle.exportKey('raw', key);
  const iv = randomBytes(12);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrappingKey, raw);
  return { iv, data };
}

async function unwrapKey(wrappingKey: CryptoKey, iv: Uint8Array, data: ArrayBuffer): Promise<VaultKey> {
  const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, wrappingKey, data);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function readConfig(database: IDBDatabase): Promise<VaultConfig | null> {
  return new Promise((resolve, reject) => {
    const request = database.transaction(VAULT_CONFIG_STORE, 'readonly').objectStore(VAULT_CONFIG_STORE).get(CONFIG_KEY);
    request.onsuccess = () => resolve((request.result as VaultConfig | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Could not read vault configuration.'));
  });
}

async function writeConfig(database: IDBDatabase, config: VaultConfig): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(VAULT_CONFIG_STORE, 'readwrite');
    transaction.objectStore(VAULT_CONFIG_STORE).put(config, CONFIG_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save vault configuration.'));
  });
}

export async function createVault(pin: string): Promise<string> {
  validatePin(pin);
  const database = await openDatabase();
  try {
    if (await readConfig(database)) throw new Error('The Privacy Vault is already set up.');
    const masterKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const pinSalt = randomBytes(16);
    const pinWrappingKey = await deriveWrappingKey(pin, pinSalt.buffer as ArrayBuffer);
    const pinWrapped = await wrapKey(pinWrappingKey, masterKey);
    const recoveryCode = toHex(randomBytes(16));
    const recoverySalt = randomBytes(16);
    const recoveryWrappingKey = await deriveWrappingKey(recoveryCode, recoverySalt.buffer as ArrayBuffer);
    const recoveryWrapped = await wrapKey(recoveryWrappingKey, masterKey);
    await writeConfig(database, {
      pinSalt: pinSalt.buffer as ArrayBuffer,
      pinIv: pinWrapped.iv,
      wrappedPinKey: pinWrapped.data,
      recoverySalt: recoverySalt.buffer as ArrayBuffer,
      recoveryIv: recoveryWrapped.iv,
      wrappedRecoveryKey: recoveryWrapped.data,
    });
    return recoveryCode;
  } finally {
    database.close();
  }
}

export async function unlockVault(pin: string): Promise<VaultKey> {
  validatePin(pin);
  const database = await openDatabase();
  try {
    const config = await readConfig(database);
    if (!config) throw new Error('Set up a Privacy Vault first.');
    const wrappingKey = await deriveWrappingKey(pin, config.pinSalt);
    try {
      return await unwrapKey(wrappingKey, config.pinIv, config.wrappedPinKey);
    } catch {
      throw new Error('Incorrect PIN. Try again or use your recovery code.');
    }
  } finally {
    database.close();
  }
}

export async function recoverVault(recoveryCode: string, newPin: string): Promise<VaultKey> {
  validatePin(newPin);
  if (!/^[a-f0-9]{32}$/i.test(recoveryCode.trim())) throw new Error('Enter the 32-character recovery code.');
  const database = await openDatabase();
  try {
    const config = await readConfig(database);
    if (!config) throw new Error('Set up a Privacy Vault first.');
    const recoveryKey = await deriveWrappingKey(recoveryCode.trim().toLowerCase(), config.recoverySalt);
    let vaultKey: VaultKey;
    try {
      vaultKey = await unwrapKey(recoveryKey, config.recoveryIv, config.wrappedRecoveryKey);
    } catch {
      throw new Error('That recovery code is not valid.');
    }
    const pinSalt = randomBytes(16);
    const pinKey = await deriveWrappingKey(newPin, pinSalt.buffer as ArrayBuffer);
    const wrapped = await wrapKey(pinKey, vaultKey);
    await writeConfig(database, { ...config, pinSalt: pinSalt.buffer as ArrayBuffer, pinIv: wrapped.iv, wrappedPinKey: wrapped.data });
    return vaultKey;
  } finally {
    database.close();
  }
}

export async function isVaultConfigured(): Promise<boolean> {
  const database = await openDatabase();
  try {
    return Boolean(await readConfig(database));
  } finally {
    database.close();
  }
}

export async function changeVaultPin(key: VaultKey, newPin: string): Promise<void> {
  validatePin(newPin);
  const database = await openDatabase();
  try {
    const config = await readConfig(database);
    if (!config) throw new Error('Set up a Privacy Vault first.');
    const pinSalt = randomBytes(16);
    const wrappingKey = await deriveWrappingKey(newPin, pinSalt.buffer as ArrayBuffer);
    const wrapped = await wrapKey(wrappingKey, key);
    await writeConfig(database, { ...config, pinSalt: pinSalt.buffer as ArrayBuffer, pinIv: wrapped.iv, wrappedPinKey: wrapped.data });
  } finally {
    database.close();
  }
}

export async function rotateRecoveryCode(key: VaultKey): Promise<string> {
  const database = await openDatabase();
  try {
    const config = await readConfig(database);
    if (!config) throw new Error('Set up a Privacy Vault first.');
    const recoveryCode = toHex(randomBytes(16));
    const recoverySalt = randomBytes(16);
    const wrappingKey = await deriveWrappingKey(recoveryCode, recoverySalt.buffer as ArrayBuffer);
    const wrapped = await wrapKey(wrappingKey, key);
    await writeConfig(database, {
      ...config,
      recoverySalt: recoverySalt.buffer as ArrayBuffer,
      recoveryIv: wrapped.iv,
      wrappedRecoveryKey: wrapped.data,
    });
    return recoveryCode;
  } finally {
    database.close();
  }
}

export async function fingerprintMediaId(id: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id));
  return toHex(new Uint8Array(digest));
}

export async function listVaultMedia(key: VaultKey): Promise<DecryptedVaultMedia[]> {
  const database = await openDatabase();
  try {
    const records = await new Promise<EncryptedVaultItem[]>((resolve, reject) => {
      const request = database.transaction(VAULT_ITEMS_STORE, 'readonly').objectStore(VAULT_ITEMS_STORE).getAll();
      request.onsuccess = () => resolve(request.result as EncryptedVaultItem[]);
      request.onerror = () => reject(request.error ?? new Error('Could not list private media.'));
    });
    const results: DecryptedVaultMedia[] = [];
    for (const record of records) {
      const aad = new TextEncoder().encode(`${record.id}:metadata`);
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: record.metadataIv, additionalData: aad }, key, record.encryptedMetadata);
      results.push({ id: record.id, ...JSON.parse(new TextDecoder().decode(plain)) as VaultMediaInfo });
    }
    return results.sort((a, b) => a.name.localeCompare(b.name));
  } finally {
    database.close();
  }
}

export async function addVaultMedia(key: VaultKey, file: File, info: VaultMediaInfo, id: string = crypto.randomUUID()): Promise<void> {
  const database = await openDatabase();
  let chunkIndex = 0;
  let created = false;
  try {
    const metadataIv = randomBytes(12);
    const encryptedMetadata = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: metadataIv, additionalData: new TextEncoder().encode(`${id}:metadata`) },
      key,
      new TextEncoder().encode(JSON.stringify(info)),
    );
    const item: EncryptedVaultItem = { id, metadataIv, encryptedMetadata, chunks: 0 };
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(VAULT_ITEMS_STORE, 'readwrite');
      transaction.objectStore(VAULT_ITEMS_STORE).add(item);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not create the private media record.'));
    });
    created = true;
    for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
      const plain = await file.slice(offset, Math.min(file.size, offset + CHUNK_SIZE)).arrayBuffer();
      const iv = randomBytes(12);
      const additionalData = new TextEncoder().encode(`${id}:${chunkIndex}`);
      const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData }, key, plain);
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(VAULT_CHUNKS_STORE, 'readwrite');
        transaction.objectStore(VAULT_CHUNKS_STORE).put({ iv, cipher }, `${id}:${chunkIndex}`);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('Could not save encrypted media data.'));
      });
      chunkIndex += 1;
    }
    item.chunks = chunkIndex;
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(VAULT_ITEMS_STORE, 'readwrite');
      transaction.objectStore(VAULT_ITEMS_STORE).put(item);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not finalize private media.'));
    });
  } catch (error) {
    if (created) {
      await deleteVaultRecord(database, id);
      for (let index = 0; index < chunkIndex; index += 1) {
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction(VAULT_CHUNKS_STORE, 'readwrite');
          transaction.objectStore(VAULT_CHUNKS_STORE).delete(`${id}:${index}`);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error ?? new Error('Could not clean up incomplete encrypted media.'));
        });
      }
    }
    throw error;
  } finally {
    database.close();
  }
}

async function deleteVaultRecord(database: IDBDatabase, id: string): Promise<void> {
  const item = await new Promise<EncryptedVaultItem | undefined>((resolve, reject) => {
    const request = database.transaction(VAULT_ITEMS_STORE, 'readonly').objectStore(VAULT_ITEMS_STORE).get(id);
    request.onsuccess = () => resolve(request.result as EncryptedVaultItem | undefined);
    request.onerror = () => reject(request.error ?? new Error('Could not inspect private media.'));
  });
  const transaction = database.transaction([VAULT_ITEMS_STORE, VAULT_CHUNKS_STORE], 'readwrite');
  transaction.objectStore(VAULT_ITEMS_STORE).delete(id);
  for (let index = 0; index < (item?.chunks ?? 0); index += 1) transaction.objectStore(VAULT_CHUNKS_STORE).delete(`${id}:${index}`);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not remove private media.'));
  });
}

export async function readVaultMedia(key: VaultKey, id: string): Promise<{ blob: Blob; info: DecryptedVaultMedia }> {
  const database = await openDatabase();
  try {
    const item = await new Promise<EncryptedVaultItem>((resolve, reject) => {
      const request = database.transaction(VAULT_ITEMS_STORE, 'readonly').objectStore(VAULT_ITEMS_STORE).get(id);
      request.onsuccess = () => request.result ? resolve(request.result as EncryptedVaultItem) : reject(new Error('Private media not found.'));
      request.onerror = () => reject(request.error ?? new Error('Could not load private media.'));
    });
    const metadataPlain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: item.metadataIv, additionalData: new TextEncoder().encode(`${id}:metadata`) },
      key,
      item.encryptedMetadata,
    );
    const info = { id, ...JSON.parse(new TextDecoder().decode(metadataPlain)) as VaultMediaInfo };
    const parts: BlobPart[] = [];
    for (let index = 0; index < item.chunks; index += 1) {
      const chunk = await new Promise<{ iv: Uint8Array; cipher: ArrayBuffer }>((resolve, reject) => {
        const request = database.transaction(VAULT_CHUNKS_STORE, 'readonly').objectStore(VAULT_CHUNKS_STORE).get(`${id}:${index}`);
        request.onsuccess = () => request.result ? resolve(request.result as { iv: Uint8Array; cipher: ArrayBuffer }) : reject(new Error('Encrypted media chunk is missing.'));
        request.onerror = () => reject(request.error ?? new Error('Could not read encrypted media.'));
      });
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: chunk.iv, additionalData: new TextEncoder().encode(`${id}:${index}`) },
        key,
        chunk.cipher,
      );
      parts.push(plain);
    }
    const blob = new Blob(parts, { type: info.type || 'application/octet-stream' });
    if (blob.size !== info.size) throw new Error('Encrypted media is incomplete. Keep the vault item until a valid copy can be restored.');
    return { blob, info };
  } finally {
    database.close();
  }
}

export async function deleteVaultMedia(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    await deleteVaultRecord(database, id);
  } finally {
    database.close();
  }
}

export async function getVaultFingerprints(): Promise<Set<string>> {
  if (typeof indexedDB === 'undefined') return new Set();
  const database = await openDatabase();
  try {
    const records = await new Promise<EncryptedVaultItem[]>((resolve, reject) => {
      const request = database.transaction(VAULT_ITEMS_STORE, 'readonly').objectStore(VAULT_ITEMS_STORE).getAll();
      request.onsuccess = () => resolve(request.result as EncryptedVaultItem[]);
      request.onerror = () => reject(request.error ?? new Error('Could not inspect private media indices.'));
    });
    return new Set(records.map((record) => record.id));
  } finally {
    database.close();
  }
}

async function vaultContainsFingerprint(fingerprint: string): Promise<boolean> {
  const database = await openDatabase();
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const request = database.transaction(VAULT_ITEMS_STORE, 'readonly').objectStore(VAULT_ITEMS_STORE).get(fingerprint);
      request.onsuccess = () => resolve(Boolean(request.result));
      request.onerror = () => reject(request.error ?? new Error('Could not inspect the private media record.'));
    });
  } finally {
    database.close();
  }
}

export async function saveVaultMedia(key: VaultKey, file: File, mediaId: string, path: string, sourceId?: string): Promise<void> {
  const fingerprint = await fingerprintMediaId(mediaId);
  if (await vaultContainsFingerprint(fingerprint)) return;
  await addVaultMedia(key, file, {
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified,
    fingerprint,
    sourcePath: path,
    sourceId,
  }, fingerprint);
}
