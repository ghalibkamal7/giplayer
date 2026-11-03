import { FormEvent, useEffect, useRef, useState } from 'react';
import { LockKeyhole, Shield, Video, X } from 'lucide-react';
import {
  changeVaultPin, createVault, DecryptedVaultMedia, deleteVaultMedia, isVaultConfigured,
  getVaultMediaIdentity, listVaultMedia, readVaultMedia, recoverVault, rotateRecoveryCode,
  saveVaultMedia, unlockVault, VaultKey,
} from '../../services/privacyVault';
import type { VideoFile } from './VideoLibrary';

type Props = {
  videos: VideoFile[];
  requestedVideos: VideoFile[];
  onHideMedia: (ids: string[]) => Promise<void>;
  onUnhideMedia: (media: DecryptedVaultMedia) => void;
  onVaultRequestComplete: () => void;
  onLock: () => void;
  onPlay: (media: DecryptedVaultMedia, file: File) => void;
};

export default function PrivacyVault({ videos, requestedVideos, onHideMedia, onUnhideMedia, onVaultRequestComplete, onLock, onPlay }: Props) {
  const keyRef = useRef<VaultKey | null>(null);
  const onLockRef = useRef(onLock);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [key, setKey] = useState<VaultKey | null>(null);
  const [items, setItems] = useState<DecryptedVaultMedia[]>([]);
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { onLockRef.current = onLock; }, [onLock]);

  useEffect(() => {
    let active = true;
    void isVaultConfigured().then((exists) => {
      if (active) setConfigured(exists);
    }).catch((reason: unknown) => {
      console.error('Could not inspect Privacy Vault setup.', reason);
      if (active) {
        setConfigured(false);
        setError('Secure browser storage is unavailable. The Privacy Vault cannot start here.');
      }
    });
    return () => {
      active = false;
      keyRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!key) return;
    keyRef.current = key;
    let lockTimer = 0;
    const lock = () => {
      if (!keyRef.current) return;
      keyRef.current = null;
      setKey(null);
      setItems([]);
      setPin('');
      setConfirmation('');
      setNewPin('');
      setRecoveryCode('');
      setShowRecovery(false);
      setStatus('Vault locked after inactivity or when the app was backgrounded.');
      onLockRef.current();
    };
    const lockOnIdle = () => {
      window.clearTimeout(lockTimer);
      lockTimer = window.setTimeout(lock, 5 * 60 * 1000);
    };
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') lock(); };
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, lockOnIdle, { passive: true }));
    document.addEventListener('visibilitychange', onVisibilityChange);
    lockOnIdle();
    return () => {
      window.clearTimeout(lockTimer);
      events.forEach((event) => window.removeEventListener(event, lockOnIdle));
      document.removeEventListener('visibilitychange', onVisibilityChange);
      keyRef.current = null;
    };
  }, [key]);

  useEffect(() => {
    if (!key) return;
    let active = true;
    void listVaultMedia(key).then((media) => {
      if (active) setItems(media);
    }).catch((reason: unknown) => {
      console.error('Could not decrypt Privacy Vault index.', reason);
      setError('Vault data could not be decrypted. The PIN may be incorrect or local data may be damaged.');
      setKey(null);
    });
    return () => { active = false; };
  }, [key]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (configured === false) {
        if (pin !== confirmation) throw new Error('PIN entries do not match.');
        const code = await createVault(pin);
        const unlockedKey = await unlockVault(pin);
        setRecoveryCode(code);
        setShowRecovery(true);
        setKey(unlockedKey);
        setConfigured(true);
        setPin('');
        setConfirmation('');
      } else {
        const unlockedKey = showRecovery
          ? await recoverVault(recoveryCode, newPin)
          : await unlockVault(pin);
        setKey(unlockedKey);
        setShowRecovery(false);
        setPin('');
        setRecoveryCode('');
        setNewPin('');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Vault setup failed.');
    } finally {
      setBusy(false);
    }
  };

  const lockVideo = async (video: VideoFile) => {
    if (!key) return;
    setBusy(true);
    setError('');
    try {
      const mediaIdentity = getVaultMediaIdentity(video.sourceId, video.relativePath, video.file);
      await saveVaultMedia(key, video.file, mediaIdentity, video.relativePath, video.sourceId);
      await onHideMedia([video.id]);
      setItems(await listVaultMedia(key));
      setStatus(`Encrypted ${video.name} and hid it from the public library.`);
    } catch (reason) {
      console.error('Could not encrypt selected private media.', reason);
      setError(reason instanceof Error ? reason.message : 'Could not encrypt this file. Check available device storage.');
    } finally {
      setBusy(false);
    }
  };

  const lockRequested = async () => {
    if (!key || !requestedVideos.length) return;
    setBusy(true);
    setError('');
    const completedVideos: VideoFile[] = [];
    try {
      for (const video of requestedVideos) {
        const mediaIdentity = getVaultMediaIdentity(video.sourceId, video.relativePath, video.file);
        await saveVaultMedia(key, video.file, mediaIdentity, video.relativePath, video.sourceId);
        completedVideos.push(video);
      }
      await onHideMedia(completedVideos.map((video) => video.id));
      setItems(await listVaultMedia(key));
      setStatus(`Encrypted ${completedVideos.length} selected video${completedVideos.length === 1 ? '' : 's'} and hid them from the public library.`);
      onVaultRequestComplete();
    } catch (reason) {
      console.error('Could not encrypt every selected video.', reason);
      if (completedVideos.length) {
        await onHideMedia(completedVideos.map((video) => video.id));
        onVaultRequestComplete();
      }
      setError(`Encrypted ${completedVideos.length} of ${requestedVideos.length} files before the operation stopped. ${reason instanceof Error ? reason.message : 'Check available device storage.'}`);
      setItems(await listVaultMedia(key));
    } finally {
      setBusy(false);
    }
  };

  const playPrivate = async (media: DecryptedVaultMedia) => {
    if (!key) return;
    setBusy(true);
    try {
      const { blob } = await readVaultMedia(key, media.id);
      const file = new File([blob], media.name, { type: media.type, lastModified: media.lastModified });
      onPlay(media, file);
    } catch (reason) {
      console.error('Could not decrypt private media for playback.', reason);
      setError('This private file could not be decrypted.');
    } finally {
      setBusy(false);
    }
  };

  const removePrivate = async (media: DecryptedVaultMedia) => {
    if (!key || !window.confirm(`Permanently delete the encrypted copy of “${media.name}”? The original file is not changed.`)) return;
    try {
      await deleteVaultMedia(media.id);
      setItems((current) => current.filter((item) => item.id !== media.id));
      onUnhideMedia(media);
      setStatus('Encrypted copy deleted. The original source file was not changed.');
    } catch (reason) {
      console.error('Could not delete private media.', reason);
      setError('Could not delete the encrypted file.');
    }
  };

  const copyRecoveryCode = async () => {
    if (!navigator.clipboard?.writeText) {
      setStatus('Clipboard access is unavailable. Select and copy the recovery code manually.');
      return;
    }
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setStatus('Recovery code copied. Keep it private.');
    } catch (reason) {
      console.error('Could not copy the recovery code.', reason);
      setError('Could not access the clipboard. Select and copy the recovery code manually.');
    }
  };

  const unlockForm = (
    <form onSubmit={(event) => void submit(event)} className="mx-auto mt-8 max-w-md space-y-4 rounded-3xl border border-white/5 bg-[#1a252f] p-6">
      <div className="text-center"><LockKeyhole className="mx-auto h-10 w-10 text-sky-300" /><h2 className="mt-3 text-xl font-bold">{configured ? 'Unlock Privacy Vault' : 'Create Privacy PIN'}</h2><p className="mt-2 text-sm text-slate-400">{configured ? 'Your PIN decrypts the local vault. It is never stored.' : 'Choose a 4–6 digit PIN to encrypt private media on this device.'}</p></div>
      {showRecovery ? <>
        <label className="block text-sm">Recovery code<input value={recoveryCode} onChange={(event) => setRecoveryCode(event.target.value)} autoComplete="off" className="mt-2 w-full rounded-xl bg-black/20 px-4 py-3 font-mono" /></label>
        <label className="block text-sm">New PIN<input value={newPin} onChange={(event) => setNewPin(event.target.value)} inputMode="numeric" pattern="[0-9]{4,6}" minLength={4} maxLength={6} required className="mt-2 w-full rounded-xl bg-black/20 px-4 py-3" /></label>
      </> : <>
        <label className="block text-sm">PIN<input value={pin} onChange={(event) => setPin(event.target.value)} inputMode="numeric" pattern="[0-9]{4,6}" minLength={4} maxLength={6} autoComplete="off" required className="mt-2 w-full rounded-xl bg-black/20 px-4 py-3 tracking-[.4em]" /></label>
        {!configured && <label className="block text-sm">Confirm PIN<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} inputMode="numeric" pattern="[0-9]{4,6}" minLength={4} maxLength={6} required className="mt-2 w-full rounded-xl bg-black/20 px-4 py-3 tracking-[.4em]" /></label>}
      </>}
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50">{busy ? 'Please wait…' : showRecovery ? 'Recover and set new PIN' : configured ? 'Unlock' : 'Create encrypted vault'}</button>
      {configured && <button type="button" onClick={() => { setShowRecovery((value) => !value); setError(''); }} className="w-full text-sm text-sky-300">{showRecovery ? 'Use PIN instead' : 'Forgot PIN? Use recovery code'}</button>}
    </form>
  );

  if (configured === null) return <p className="mt-10 text-center text-sm text-slate-400">Checking secure vault storage…</p>;

  return <section className="mx-auto mt-6 max-w-4xl">
    <div className="rounded-3xl border border-sky-500/15 bg-gradient-to-br from-[#172b3b] to-[#17232d] p-5 sm:p-7">
      <div className="flex items-start gap-4"><span className="rounded-2xl bg-sky-400/10 p-3"><Shield className="h-7 w-7 text-sky-300" /></span><div><h2 className="text-xl font-bold">Privacy Vault</h2><p className="mt-1 text-sm leading-6 text-slate-300">Private copies are encrypted with AES-GCM before being saved on this device. The original source file remains unchanged and is still accessible outside GIPlayer; locking only hides it inside this library. Browser storage can still be cleared by the user or operating system.</p></div></div>
    </div>
    {showRecovery && recoveryCode && <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4"><p className="font-semibold text-amber-100">Save this recovery code now</p><p className="mt-1 text-sm text-amber-100/80">This code is shown only now. If you dismiss it, you can generate a replacement while the vault is unlocked.</p><code className="mt-3 block select-all break-all rounded-lg bg-black/30 p-3 font-mono text-lg tracking-wider">{recoveryCode}</code><button onClick={() => void copyRecoveryCode()} className="mt-3 rounded-lg bg-amber-200/10 px-3 py-2 text-sm text-amber-100">Copy recovery code</button><button onClick={() => { setShowRecovery(false); setRecoveryCode(''); }} className="ml-2 rounded-lg bg-amber-200/10 px-3 py-2 text-sm text-amber-100">I saved it</button></div>}
    {status && <p role="status" className="mt-4 rounded-xl bg-sky-400/10 px-4 py-3 text-sm text-sky-100">{status}</p>}
    {key ? <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Encrypted private media</h3><p className="text-sm text-slate-400">{items.length} item{items.length === 1 ? '' : 's'} · auto-locks after 5 minutes idle or when backgrounded</p></div><button onClick={() => { keyRef.current = null; setKey(null); setItems([]); setPin(''); setConfirmation(''); setNewPin(''); setRecoveryCode(''); setShowRecovery(false); setStatus('Vault locked.'); onLock(); }} className="rounded-xl bg-white/5 px-4 py-2 text-sm"><LockKeyhole className="mr-2 inline h-4 w-4" />Lock vault</button></div>
      <form onSubmit={(event) => { event.preventDefault(); void changeVaultPin(key, newPin).then(() => { setNewPin(''); setStatus('PIN changed.'); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not change PIN.')); }} className="mt-4 flex gap-2"><input aria-label="New PIN" placeholder="Change PIN (4–6 digits)" inputMode="numeric" pattern="[0-9]{4,6}" minLength={4} maxLength={6} value={newPin} onChange={(event) => setNewPin(event.target.value)} className="min-w-0 flex-1 rounded-xl bg-white/5 px-3 py-2 text-sm" /><button className="rounded-xl bg-white/10 px-3 text-sm">Change PIN</button></form>
      <button onClick={() => void rotateRecoveryCode(key).then((code) => { setRecoveryCode(code); setShowRecovery(true); setStatus('A new recovery code was generated. The previous code is no longer valid.'); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not rotate recovery code.'))} className="mt-2 text-sm text-sky-300">Generate a new recovery code</button>
      {requestedVideos.length > 0 && <div className="mt-5 rounded-2xl border border-sky-400/15 bg-sky-400/5 p-4"><p className="font-semibold">Lock selected folder · {requestedVideos.length} videos</p><p className="mt-1 text-xs text-slate-400">Encrypt each selected video into the vault. The source files remain untouched.</p><button disabled={busy} onClick={() => void lockRequested()} className="mt-3 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? 'Encrypting…' : 'Encrypt folder videos'}</button></div>}
      {videos.length > 0 && <div className="mt-6"><h3 className="mb-2 text-sm font-semibold text-slate-300">Lock a video</h3><div className="max-h-64 space-y-2 overflow-auto">{videos.map((video) => <div key={video.id} className="flex items-center gap-3 rounded-xl bg-black/15 p-3"><Video className="h-4 w-4 text-slate-400" /><span className="min-w-0 flex-1 truncate text-sm">{video.name}</span><button disabled={busy} onClick={() => void lockVideo(video)} className="rounded-lg bg-sky-400/10 px-3 py-1.5 text-xs text-sky-200 disabled:opacity-50">Encrypt & hide</button></div>)}</div></div>}
      <div className="mt-6 space-y-2">
        <h3 className="text-sm font-semibold text-slate-300">Private media</h3>
        {items.length ? items.map((item) => <article key={item.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/15 p-3"><LockKeyhole className="h-4 w-4 shrink-0 text-sky-300" /><span className="min-w-0 flex-1 truncate text-sm">{item.name}</span><span className="text-xs text-slate-500">{(item.size / 1024 / 1024).toFixed(1)} MB</span><button disabled={busy} onClick={() => void playPrivate(item)} className="rounded-lg bg-sky-500/15 px-3 py-1.5 text-xs text-sky-200">Play</button><button disabled={busy} onClick={() => void removePrivate(item)} aria-label={`Delete ${item.name}`} className="rounded p-2 text-slate-400 hover:text-rose-300"><X className="h-4 w-4" /></button></article>) : <p className="rounded-xl bg-black/10 p-4 text-sm text-slate-400">No private media yet. Encrypt a video above to add it.</p>}
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
    </> : !showRecovery && unlockForm}
    {!key && showRecovery && unlockForm}
    <p className="mt-5 text-xs leading-5 text-slate-500">The PIN is never stored. PIN and recovery keys are derived with PBKDF2; the vault key and each media chunk are encrypted with AES-GCM and unique random IVs. Private playback decrypts the selected file into browser memory, so very large videos may exceed available memory. If both PIN and recovery code are lost, encrypted copies cannot be recovered. The vault is local to this browser profile; it is not cloud-synced.</p>
  </section>;
}
