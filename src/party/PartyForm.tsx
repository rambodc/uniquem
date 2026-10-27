import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ImagePlus, Trash2 } from "lucide-react";
import { createParty, getParty, getPartyPhoto, removePartyPhoto, setPartyPhoto, updateParty, type PartyInput } from "../core/api";
import { Page, messageOf } from "./Workspace";
import { edmontonInputToIso, isoToEdmontonInput } from "./time";
import { checkPhotoFile, preparePhoto } from "./photo";

type Photo = { photo: string; thumb: string; previewUrl: string };
const empty = { name: "", startsAt: "", location: "", description: "", capacity: "", hostNotes: "" };
export default function PartyForm() {
  const { partyId } = useParams(), navigate = useNavigate(), editing = Boolean(partyId), fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(empty), [loading, setLoading] = useState(editing), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [existingPhoto, setExistingPhoto] = useState<string | null>(null), [newPhoto, setNewPhoto] = useState<Photo | null>(null), [removePhoto, setRemovePhoto] = useState(false), [photoBusy, setPhotoBusy] = useState(false);
  useEffect(() => {
    if (!partyId) return;
    let active = true;
    getParty(partyId).then(({ party }) => {
      if (!active) return;
      setForm({ name: party.name, startsAt: party.startsAt ? isoToEdmontonInput(party.startsAt) : "", location: party.location, description: party.description, capacity: party.capacity == null ? "" : String(party.capacity), hostNotes: party.hostNotes });
      setLoading(false);
      if (party.hasPhoto) getPartyPhoto(partyId).then((result) => { if (active) setExistingPhoto(result.dataUrl); }, () => undefined);
    }, (cause) => { if (active) { setError(messageOf(cause, "That party could not be loaded.")); setLoading(false); } });
    return () => { active = false; };
  }, [partyId]);
  const set = (key: keyof typeof empty) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
    const problem = checkPhotoFile(file); if (problem) { setError(problem); return; }
    setError(""); setPhotoBusy(true);
    try { setNewPhoto(await preparePhoto(file)); setRemovePhoto(false); } catch (cause) { setError(messageOf(cause, "This image could not be prepared.")); } finally { setPhotoBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    const iso = edmontonInputToIso(form.startsAt); if (!iso) { setError("Enter a valid date and time."); return; }
    const capacityText = form.capacity.trim(); if (capacityText && !/^\d{1,6}$/.test(capacityText)) { setError("Capacity must be a whole number."); return; }
    const data: PartyInput = { name: form.name, startsAt: iso, location: form.location, description: form.description, capacity: capacityText ? Number(capacityText) : null, hostNotes: form.hostNotes };
    setBusy(true);
    let id = partyId, saved = false;
    try {
      if (id) await updateParty(id, data); else id = (await createParty(data)).partyId;
      saved = true;
      if (newPhoto) await setPartyPhoto(id!, { photo: newPhoto.photo, thumb: newPhoto.thumb });
      else if (removePhoto && existingPhoto) await removePartyPhoto(id!);
      navigate(`/party/${id}`);
    } catch (cause) {
      if (saved && id) { navigate(`/party/${id}`, { replace: true, state: { notice: "The party was saved, but the photo could not be uploaded. Open Edit to try the photo again." } }); return; }
      setError(messageOf(cause, "The party could not be saved. Try again.")); setBusy(false);
    }
  }
  const preview = newPhoto?.previewUrl ?? (removePhoto ? null : existingPhoto);
  return <Page narrow title={editing ? "Edit party" : "Create party"} back={{ to: partyId ? `/party/${partyId}` : "/party", label: partyId ? "Party" : "Parties" }}>
    {loading ? <div className="ws-empty">Loading…</div> : <form className="ws-form" onSubmit={submit}>
      {error && <div className="ws-status error" role="alert">{error}</div>}
      <label>Party name<input value={form.name} onChange={set("name")} maxLength={120} required /></label>
      <label>Date and time <em>(Calgary time)</em><input type="datetime-local" value={form.startsAt} onChange={set("startsAt")} required /></label>
      <label>Location<input value={form.location} onChange={set("location")} maxLength={200} required /></label>
      <label>Description <em>(optional)</em><textarea value={form.description} onChange={set("description")} maxLength={2000} rows={4} /></label>
      <label>Capacity <em>(optional)</em><input inputMode="numeric" value={form.capacity} onChange={set("capacity")} maxLength={6} placeholder="e.g. 120" /></label>
      <label>Private host notes <em>(staff only)</em><textarea value={form.hostNotes} onChange={set("hostNotes")} maxLength={2000} rows={4} /></label>
      <div className="ws-photo-field"><span>Theme photo <em>(JPEG, PNG or WebP, up to 5 MB)</em></span>
        {preview && <img className="ws-photo-preview" src={preview} alt="Theme photo preview" />}
        <div className="ws-row">
          <button type="button" className="ws-button ghost" onClick={() => fileInput.current?.click()} disabled={photoBusy}><ImagePlus size={18} /> {photoBusy ? "Preparing…" : preview ? "Change photo" : "Add photo"}</button>
          {preview && <button type="button" className="ws-button ghost" onClick={() => { setNewPhoto(null); setRemovePhoto(true); }}><Trash2 size={18} /> Remove photo</button>}
        </div>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void choosePhoto(event.target.files?.[0])} />
      </div>
      <div className="ws-row"><button className="ws-button" disabled={busy || photoBusy}>{busy ? "Saving…" : editing ? "Save changes" : "Create party"}</button><button type="button" className="ws-button ghost" onClick={() => navigate(partyId ? `/party/${partyId}` : "/party")} disabled={busy}>Cancel</button></div>
    </form>}
  </Page>;
}
