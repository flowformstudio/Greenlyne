import { useEffect, useRef, useState } from 'react'
import { usePartners } from '../lib/PartnersContext'
import {
  MERCHANT_KINDS, LENDER_TYPES,
  setActivePartner, createPartner, updatePartner, deletePartner,
} from '../lib/partners'

/**
 * Manage Demo modal — accessed via the "Jump to" dropdown.
 * Lets the user CRUD merchants & lenders and pick which is currently active.
 * The selection cascades through the entire demo via PartnersContext.
 */
export default function ManageDemoModal() {
  const { manageOpen, closeManage, manageTab, setManageTab,
          merchants, lenders, merchant, lender } = usePartners()
  const [editing, setEditing] = useState(null) // { mode: 'create'|'edit', role, partner? }
  const [error, setError] = useState('')

  // Close on ESC
  useEffect(() => {
    if (!manageOpen) return
    const onKey = e => { if (e.key === 'Escape') closeManage() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [manageOpen, closeManage])

  // Reset transient state when the modal opens/closes.
  useEffect(() => {
    if (!manageOpen) { setEditing(null); setError('') }
  }, [manageOpen])

  if (!manageOpen) return null

  const role = manageTab // 'merchant' | 'lender'
  const list = role === 'merchant' ? merchants : lenders
  const activeId = role === 'merchant' ? merchant?.id : lender?.id

  async function handleSetActive(id) {
    setError('')
    try { await setActivePartner(role, id) }
    catch (e) { setError(e?.message || 'Failed to set default') }
  }

  async function handleDelete(p) {
    if (p.id === activeId) {
      setError(`This ${role} is currently the default. Switch to another ${role} first.`)
      return
    }
    if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return
    setError('')
    try { await deletePartner(role, p.id) }
    catch (e) { setError(e?.message || 'Failed to delete') }
  }

  return (
    <div
      onClick={closeManage}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(7, 9, 14, 0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(680px, 100%)', maxHeight: 'calc(100vh - 40px)',
          background: '#fff', borderRadius: 16, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          fontFamily: "'PostGrotesk', system-ui, sans-serif",
        }}
      >
        <Header onClose={closeManage} merchant={merchant} lender={lender} />

        <Tabs role={role} setRole={r => { setManageTab(r); setEditing(null); setError('') }} />

        {error && (
          <div style={{ padding: '10px 24px', background: '#fef2f2', color: '#991b1b', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 20px' }}>
          {editing ? (
            <PartnerForm
              key={editing.partner?.id || 'new'}
              role={editing.role}
              partner={editing.partner}
              onCancel={() => setEditing(null)}
              onSaved={() => setEditing(null)}
              setError={setError}
            />
          ) : (
            <PartnerList
              role={role}
              list={list}
              activeId={activeId}
              onSetActive={handleSetActive}
              onEdit={p => setEditing({ mode: 'edit', role, partner: p })}
              onDelete={handleDelete}
              onAdd={() => setEditing({ mode: 'create', role })}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Header ──────────────────────────────────────────────────── */

function Header({ onClose, merchant, lender }) {
  return (
    <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(0,22,96,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,22,96,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Demo Setup
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#001660', margin: '4px 0 0' }}>Manage Demo</h2>
          <div style={{ fontSize: 12, color: 'rgba(0,22,96,0.55)', marginTop: 2 }}>
            Players, logos, and default selection. Cascades through the entire demo.
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" style={iconBtn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Active row */}
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <ActivePill label="Merchant" partner={merchant} kindLabel={kindLabelOf('merchant', merchant?.kind)} />
        <ActivePill label="Lender"   partner={lender}   kindLabel={kindLabelOf('lender',   lender?.type)} />
      </div>
    </div>
  )
}

function ActivePill({ label, partner, kindLabel }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: 10, background: 'rgba(0,22,96,0.04)',
      border: '1px solid rgba(0,22,96,0.08)',
    }}>
      <LogoThumb url={partner?.logoUrl} name={partner?.name} w={81} h={55} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(0,22,96,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#001660', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {partner?.name || '—'}
        </div>
        {kindLabel && (
          <div style={{ fontSize: 11, color: 'rgba(0,22,96,0.55)' }}>{kindLabel}</div>
        )}
      </div>
    </div>
  )
}

function kindLabelOf(role, key) {
  const list = role === 'merchant' ? MERCHANT_KINDS : LENDER_TYPES
  return list.find(k => k.id === key)?.label || ''
}

/* ── Tabs ────────────────────────────────────────────────────── */

function Tabs({ role, setRole }) {
  return (
    <div style={{ display: 'flex', padding: '12px 24px 0', gap: 6 }}>
      {[
        { id: 'merchant', label: 'Merchants' },
        { id: 'lender',   label: 'Lenders' },
      ].map(t => {
        const on = role === t.id
        return (
          <button
            key={t.id}
            onClick={() => setRole(t.id)}
            style={{
              padding: '8px 14px', borderRadius: 8,
              fontSize: 13, fontWeight: 600,
              background: on ? '#001660' : 'transparent',
              color: on ? '#fff' : 'rgba(0,22,96,0.6)',
              border: on ? '1px solid #001660' : '1px solid transparent',
              cursor: 'pointer', transition: 'all 0.12s',
            }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

/* ── List ────────────────────────────────────────────────────── */

function PartnerList({ role, list, activeId, onSetActive, onEdit, onDelete, onAdd }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {list.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', color: 'rgba(0,22,96,0.4)', fontSize: 13 }}>
          No {role}s yet. Add one to get started.
        </div>
      )}
      {list.map(p => {
        const isActive = p.id === activeId
        const sub = role === 'merchant'
          ? kindLabelOf('merchant', p.kind)
          : [kindLabelOf('lender', p.type), p.nmls && `NMLS ${p.nmls}`].filter(Boolean).join(' · ')
        return (
          <div
            key={p.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 10,
              border: `1px solid ${isActive ? 'rgba(1,97,99,0.5)' : 'rgba(0,22,96,0.1)'}`,
              background: isActive ? 'rgba(147,221,186,0.12)' : '#fff',
            }}
          >
            <button
              onClick={() => onSetActive(p.id)}
              aria-label={isActive ? 'Default' : 'Set as default'}
              style={{
                flexShrink: 0, width: 18, height: 18, borderRadius: 999,
                border: `2px solid ${isActive ? '#016163' : 'rgba(0,22,96,0.25)'}`,
                background: '#fff', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {isActive && <span style={{ width: 8, height: 8, borderRadius: 999, background: '#016163' }} />}
            </button>
            <LogoThumb url={p.logoUrl} name={p.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#001660', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.name}
              </div>
              {sub && <div style={{ fontSize: 12, color: 'rgba(0,22,96,0.55)' }}>{sub}</div>}
            </div>
            {isActive && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#fff',
                background: '#016163',
                padding: '4px 9px', borderRadius: 5,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                Default
              </span>
            )}
            <button onClick={() => onEdit(p)} style={smallBtn}>Edit</button>
            <button onClick={() => onDelete(p)} style={{ ...smallBtn, color: '#b91c1c' }}>Delete</button>
          </div>
        )
      })}
      <button
        onClick={onAdd}
        style={{
          marginTop: 4, padding: '12px', borderRadius: 10,
          border: '1.5px dashed rgba(0,22,96,0.25)',
          background: 'transparent', cursor: 'pointer',
          color: '#254BCE', fontSize: 13, fontWeight: 600,
          fontFamily: 'inherit',
        }}
      >
        + Add {role === 'merchant' ? 'merchant' : 'lender'}
      </button>
    </div>
  )
}

/* ── Form (create / edit) ────────────────────────────────────── */

function PartnerForm({ role, partner, onCancel, onSaved, setError }) {
  const isEdit = !!partner
  const [name, setName]             = useState(partner?.name || '')
  const [kind, setKind]             = useState(partner?.kind || partner?.type ||
    (role === 'merchant' ? 'solar' : 'fintech'))
  const [brandColor, setBrandColor] = useState(partner?.brandColor || '')
  const [tagline, setTagline]       = useState(partner?.tagline || '')
  const [nmls, setNmls]             = useState(partner?.nmls || '')
  const [logoFile,     setLogoFile]     = useState(null)
  const [logoPreview,  setLogoPreview]  = useState(partner?.logoUrl || '')
  const [coverFile,    setCoverFile]    = useState(null)
  const [coverPreview, setCoverPreview] = useState(partner?.coverImageUrl || '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    try {
      const data = {
        name: name.trim(),
        ...(role === 'merchant' ? { kind } : { type: kind, nmls: nmls.trim() || undefined }),
        brandColor: brandColor.trim() || undefined,
        tagline:    tagline.trim() || undefined,
      }
      const files = { logo: logoFile, coverImage: coverFile }
      if (isEdit) await updatePartner(role, partner.id, data, files)
      else        await createPartner(role, data, files)
      onSaved()
    } catch (err) {
      setError(err?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#001660', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {isEdit ? 'Edit' : 'Add'} {role}
      </div>

      {/* Wordmark / horizontal logo */}
      <LogoDropzone
        label="Logo"
        hint="Used in headers, email, and footers"
        preview={logoPreview}
        onFile={f => { setLogoFile(f); readPreview(f, setLogoPreview) }}
        previewBox={{ w: 112, h: 56 }}
      />

      {/* Merchant-only: cover image used in the email preview */}
      {role === 'merchant' && (
        <LogoDropzone
          label="Cover image"
          hint="Hero photo at the top of the email preview"
          preview={coverPreview}
          onFile={f => { setCoverFile(f); readPreview(f, setCoverPreview) }}
          previewBox={{ w: 168, h: 56 }}
          coverMode
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
        <Field label="Name" required>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder={role === 'merchant' ? 'Westhaven Power' : 'Owning'} />
        </Field>
        <Field label={role === 'merchant' ? 'Type' : 'Lender type'} required>
          <Select value={kind} onChange={e => setKind(e.target.value)}>
            {(role === 'merchant' ? MERCHANT_KINDS : LENDER_TYPES).map(k =>
              <option key={k.id} value={k.id}>{k.label}</option>
            )}
          </Select>
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Brand color (optional)">
          <Input value={brandColor} onChange={e => setBrandColor(e.target.value)} placeholder="#e0271a" />
        </Field>
        {role === 'lender' ? (
          <Field label="NMLS # (optional)">
            <Input value={nmls} onChange={e => setNmls(e.target.value)} placeholder="2611" />
          </Field>
        ) : (
          <Field label="Tagline (optional)">
            <Input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Northern California solar installer" />
          </Field>
        )}
      </div>
      {role === 'lender' && (
        <Field label="Tagline (optional)">
          <Input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Lending services" />
        </Field>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <button type="button" onClick={onCancel} disabled={saving} style={btnGhost}>Cancel</button>
        <button type="submit" disabled={saving} style={btnPrimary}>
          {saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Create')}
        </button>
      </div>
    </form>
  )
}

/* ── Logo dropzone ───────────────────────────────────────────── */

function readPreview(f, setPreview) {
  if (!f) return
  const reader = new FileReader()
  reader.onload = e => setPreview(e.target.result)
  reader.readAsDataURL(f)
}

function blobToDataUri(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Could not read blob'))
    reader.readAsDataURL(blob)
  })
}

function LogoDropzone({ label, hint, preview, onFile, previewBox = { w: 80, h: 40 }, square = false, coverMode = false }) {
  const ref = useRef(null)
  const [bgRemoving, setBgRemoving] = useState(false)
  const [bgError, setBgError]       = useState('')
  // Snapshots so the user can flip between the original upload and the bg-removed version.
  const [originalSrc, setOriginalSrc] = useState('')   // data URI / URL of the most recent upload
  const [noBgSrc,     setNoBgSrc]     = useState('')   // data URI of the bg-removed result
  const [showing,     setShowing]     = useState('current') // 'current' | 'original' | 'noBg'

  // Capture current preview as the "original" the first time we see one (for partners loaded with
  // an existing logoUrl, or the very first upload). After that, only resets on a brand-new upload.
  useEffect(() => {
    if (preview && !originalSrc && !noBgSrc) setOriginalSrc(preview)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview])

  function handleNewUpload(file) {
    if (!file) return
    setNoBgSrc('')          // any prior bg-removed version is invalid for a new upload
    setShowing('current')
    setBgError('')
    // Save the new original as a data URI (async, doesn't block onFile)
    const reader = new FileReader()
    reader.onload = e => setOriginalSrc(e.target.result)
    reader.readAsDataURL(file)
    onFile(file)
  }

  async function handleRemoveBackground() {
    if (!preview) return
    setBgError('')
    setBgRemoving(true)
    try {
      const { removeBackground } = await import('@imgly/background-removal')
      // Run on the original if we have it, so users can re-run cleanly after toggling.
      const sourceBlob = await (await fetch(originalSrc || preview)).blob()
      const outBlob    = await removeBackground(sourceBlob)
      const outFile    = new File([outBlob], 'logo.png', { type: outBlob.type || 'image/png' })
      const outUri     = await blobToDataUri(outBlob)
      setNoBgSrc(outUri)
      setShowing('noBg')
      onFile(outFile)
    } catch (e) {
      console.error('[bg-remove]', e)
      setBgError(e?.message || 'Background removal failed')
    } finally { setBgRemoving(false) }
  }

  async function handleShowOriginal() {
    if (!originalSrc) return
    try {
      const blob = await (await fetch(originalSrc)).blob()
      const file = new File([blob], 'logo-original', { type: blob.type || 'image/png' })
      setShowing('original')
      onFile(file)
    } catch (e) {
      console.error('[show-original]', e)
    }
  }

  async function handleShowNoBg() {
    if (!noBgSrc) return
    try {
      const blob = await (await fetch(noBgSrc)).blob()
      const file = new File([blob], 'logo.png', { type: blob.type || 'image/png' })
      setShowing('noBg')
      onFile(file)
    } catch (e) {
      console.error('[show-nobg]', e)
    }
  }

  return (
    <div>
      <Label>{label}</Label>
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleNewUpload(e.dataTransfer.files?.[0]) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: 14, borderRadius: 10,
          border: '1.5px dashed rgba(0,22,96,0.22)',
          background: 'rgba(0,22,96,0.02)',
        }}
      >
        <button
          type="button"
          onClick={() => ref.current?.click()}
          style={{
            width: previewBox.w, height: previewBox.h,
            borderRadius: square ? '50%' : 6,
            background:
              'repeating-conic-gradient(#f3f4f6 0% 25%, #fff 0% 50%) 0 0 / 12px 12px, #fff',
            border: '1px solid rgba(0,22,96,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0, cursor: 'pointer', padding: 0,
          }}
          aria-label="Choose file"
        >
          {preview
            ? (coverMode
                ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <img src={preview} alt="" style={{
                    maxHeight: previewBox.h - 8,
                    maxWidth:  previewBox.w - 8,
                    objectFit: 'contain',
                  }} />)
            : <span style={{ fontSize: 10, color: 'rgba(0,22,96,0.4)' }}>None</span>}
        </button>
        <div style={{ fontSize: 12, color: 'rgba(0,22,96,0.6)', minWidth: 0, flex: 1 }}>
          <button
            type="button"
            onClick={() => ref.current?.click()}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600, color: '#254BCE', fontSize: 12, fontFamily: 'inherit' }}
          >
            Click or drop a file
          </button>
          {hint && <div style={{ fontSize: 11, color: 'rgba(0,22,96,0.5)' }}>{hint}</div>}
          {coverMode ? (
            <>
              <div style={{ fontSize: 11, color: 'rgba(0,22,96,0.55)' }}>
                Recommended: 1200 × 400 px (3:1 horizontal photo)
              </div>
              <div style={{ fontSize: 11, color: 'rgba(0,22,96,0.5)' }}>
                JPG, PNG, AVIF, or WEBP · ≤ 400 KB
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#016163' }}>
                Use a transparent PNG (or SVG)
              </div>
              <div style={{ fontSize: 11, color: 'rgba(0,22,96,0.55)' }}>
                Recommended size: 600 × 140 px
              </div>
              <div style={{ fontSize: 11, color: 'rgba(0,22,96,0.5)' }}>
                PNG, SVG, AVIF, or WEBP · ≤ 400 KB · trim whitespace
              </div>
            </>
          )}
          {preview && !coverMode && (
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleRemoveBackground}
                disabled={bgRemoving}
                style={{
                  fontSize: 11, fontWeight: 600,
                  padding: '5px 10px', borderRadius: 6,
                  border: '1px solid rgba(1,97,99,0.4)',
                  background: bgRemoving ? 'rgba(1,97,99,0.06)' : 'rgba(1,97,99,0.08)',
                  color: '#016163', cursor: bgRemoving ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {bgRemoving ? 'Removing background…' : (noBgSrc ? '✦ Re-run remove background' : '✦ Remove background')}
              </button>

              {/* Show original / Show no-background — only after a removal has run */}
              {noBgSrc && originalSrc && (
                <>
                  <button
                    type="button"
                    onClick={handleShowOriginal}
                    disabled={showing === 'original'}
                    style={{
                      fontSize: 11, fontWeight: 600,
                      padding: '5px 10px', borderRadius: 6,
                      border: '1px solid rgba(0,22,96,0.18)',
                      background: showing === 'original' ? 'rgba(0,22,96,0.10)' : 'transparent',
                      color: '#001660',
                      cursor: showing === 'original' ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Show original
                  </button>
                  <button
                    type="button"
                    onClick={handleShowNoBg}
                    disabled={showing === 'noBg'}
                    style={{
                      fontSize: 11, fontWeight: 600,
                      padding: '5px 10px', borderRadius: 6,
                      border: '1px solid rgba(0,22,96,0.18)',
                      background: showing === 'noBg' ? 'rgba(0,22,96,0.10)' : 'transparent',
                      color: '#001660',
                      cursor: showing === 'noBg' ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Show no-background
                  </button>
                </>
              )}

              {!noBgSrc && (
                <span style={{ fontSize: 10, color: 'rgba(0,22,96,0.45)' }}>
                  {bgRemoving ? '~10–30s, runs in your browser' : 'Free · runs locally'}
                </span>
              )}
            </div>
          )}
          {bgError && <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 4 }}>{bgError}</div>}
        </div>
        <input
          ref={ref}
          type="file"
          accept="image/png,image/svg+xml,image/jpeg,image/webp,image/avif"
          style={{ display: 'none' }}
          onChange={e => handleNewUpload(e.target.files?.[0])}
        />
      </div>
    </div>
  )
}

/* ── Pieces ──────────────────────────────────────────────────── */

function LogoThumb({ url, name, w = 44, h = 30 }) {
  const padX = 6, padY = 6
  return (
    <div style={{
      width: w, height: h, borderRadius: 5, background: '#fff',
      border: '1px solid rgba(0,22,96,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {url
        ? <img src={url} alt={name || ''} style={{ maxHeight: h - padY, maxWidth: w - padX, objectFit: 'contain' }} />
        : <span style={{ fontSize: 9, color: 'rgba(0,22,96,0.35)', textAlign: 'center' }}>{(name || '?').slice(0,2)}</span>}
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <Label>{label}{required && <span style={{ color: '#dc2626' }}> *</span>}</Label>
      {children}
    </div>
  )
}

function Label({ children }) {
  return <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(0,22,96,0.65)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{children}</label>
}

const inputBase = {
  padding: '10px 12px', borderRadius: 8,
  border: '1px solid rgba(0,22,96,0.16)', background: '#fff',
  fontSize: 13, color: '#001660', fontFamily: 'inherit', outline: 'none',
  width: '100%', boxSizing: 'border-box',
}
function Input(props) { return <input {...props} style={{ ...inputBase, ...(props.style||{}) }} /> }
function Select(props) { return <select {...props} style={{ ...inputBase, ...(props.style||{}) }} /> }

const iconBtn = {
  width: 30, height: 30, borderRadius: 8, padding: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: '1px solid rgba(0,22,96,0.12)',
  color: 'rgba(0,22,96,0.6)', cursor: 'pointer',
}
const smallBtn = {
  padding: '6px 10px', borderRadius: 6,
  background: 'transparent', border: '1px solid rgba(0,22,96,0.14)',
  color: 'rgba(0,22,96,0.7)', fontSize: 12, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
}
const btnGhost = {
  padding: '10px 16px', borderRadius: 8,
  background: 'transparent', border: '1px solid rgba(0,22,96,0.18)',
  color: '#001660', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
const btnPrimary = {
  padding: '10px 18px', borderRadius: 8,
  background: '#001660', border: '1px solid #001660',
  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
