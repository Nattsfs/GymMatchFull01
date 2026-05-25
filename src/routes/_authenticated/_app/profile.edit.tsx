import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, Camera, Lock, X, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/profile/edit")({ component: EditProfile });

const GENDERS = [
  { v: "male", l: "Masculino" },
  { v: "female", l: "Feminino" },
  { v: "non_binary", l: "Não-binário" },
  { v: "other", l: "Prefiro não dizer" },
] as const;
const ORIENTATIONS = [
  { v: "heterosexual", l: "Heterossexual" },
  { v: "homosexual", l: "Homossexual" },
  { v: "bisexual", l: "Bissexual" },
  { v: "pansexual", l: "Pansexual" },
  { v: "prefer_not", l: "Prefiro não dizer" },
];
const LEVELS = [
  { v: "beginner", l: "Iniciante" },
  { v: "intermediate", l: "Intermediário" },
  { v: "advanced", l: "Avançado" },
] as const;
const MODALITIES = ["Musculação", "CrossFit", "Natação", "Pilates", "Corrida", "Yoga", "Artes Marciais", "Ciclismo", "Outro"];
const SPLITS = ["ABC", "ABCD", "ABCDE", "Superior/Inferior", "Full Body", "Outro"];
const GOALS = [
  { v: "training_partner", l: "Parceiro de treino" },
  { v: "friends", l: "Amizade" },
  { v: "romance", l: "Romance" },
] as const;
const HOURS = [
  { v: "morning", l: "Manhã" },
  { v: "afternoon", l: "Tarde" },
  { v: "night", l: "Noite" },
] as const;

type Form = {
  name: string;
  gender: string;
  sexual_orientation: string;
  hide_orientation: boolean;
  training_level: string;
  modalities: string[];
  training_split: string;
  goal: string;
  available_hours: string[];
  hide_hours: boolean;
  interests: string[];
  photo_url: string | null;
  gym_ids: string[];
};
type Locked = { email: string | null; cpf: string | null; phone: string | null; age: number | null };
type Gym = { id: string; name: string; address: string | null };

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function EditProfile() {
  const { user, refreshProfile } = useAuth();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Form>({
    name: "", gender: "", sexual_orientation: "", hide_orientation: false,
    training_level: "", modalities: [], training_split: "",
    goal: "", available_hours: [], hide_hours: false,
    interests: [], photo_url: null, gym_ids: [],
  });
  const [locked, setLocked] = useState<Locked>({ email: null, cpf: null, phone: null, age: null });
  const [interestInput, setInterestInput] = useState("");
  const [nameError, setNameError] = useState("");
  const [gymError, setGymError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [allGyms, setAllGyms] = useState<Gym[]>([]);
  const [initialGymIds, setInitialGymIds] = useState<string[]>([]);
  const [gymSearch, setGymSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles")
      .select("name,gender,sexual_orientation,hide_orientation,training_level,modalities,training_split,goal,available_hours,hide_hours,interests,photo_url,email,cpf,phone,age")
      .eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setForm((f) => ({
          ...f,
          name: data.name ?? "",
          gender: data.gender ?? "",
          sexual_orientation: data.sexual_orientation ?? "",
          hide_orientation: !!data.hide_orientation,
          training_level: data.training_level ?? "",
          modalities: data.modalities ?? [],
          training_split: data.training_split ?? "",
          goal: data.goal ?? "",
          available_hours: data.available_hours ?? [],
          hide_hours: !!data.hide_hours,
          interests: data.interests ?? [],
          photo_url: data.photo_url,
        }));
        setLocked({ email: data.email, cpf: data.cpf, phone: data.phone, age: data.age });
      });
    supabase.from("gyms").select("id,name,address").eq("active", true).order("name")
      .then(({ data }) => setAllGyms((data ?? []) as Gym[]));
    supabase.from("user_gyms").select("gym_id").eq("user_id", user.id)
      .then(({ data }) => {
        const ids = (data ?? []).map((r) => r.gym_id as string);
        setInitialGymIds(ids);
        setForm((f) => ({ ...f, gym_ids: ids }));
      });
  }, [user]);

  async function pickFromGallery() {
    setSheet(false);
    fileRef.current?.click();
  }

  async function onFile(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await supabase.from("profiles").update({ photo_url: urlData.publicUrl }).eq("id", user.id);
      if (error) throw error;
      setForm((f) => ({ ...f, photo_url: urlData.publicUrl }));
      toast.success("Foto atualizada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar foto");
    } finally { setUploading(false); }
  }

  async function removePhoto() {
    setSheet(false);
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ photo_url: null }).eq("id", user.id);
    if (error) return toast.error(error.message);
    setForm((f) => ({ ...f, photo_url: null }));
    toast.success("Foto removida");
  }

  function addInterest() {
    const v = interestInput.trim();
    if (!v) return;
    if (form.interests.length >= 5) { toast.error("Máximo de 5 interesses"); return; }
    if (form.interests.includes(v)) return;
    setForm({ ...form, interests: [...form.interests, v] });
    setInterestInput("");
  }

  async function save() {
    if (!user) return;
    const name = form.name.trim();
    if (!name) { setNameError("Este campo é obrigatório"); return; }
    if (name.length > 60) { setNameError("Máximo de 60 caracteres"); return; }
    setNameError("");
    if (form.gym_ids.length === 0) {
      setGymError("Selecione pelo menos uma academia");
      return;
    }
    setGymError("");
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      name,
      gender: (form.gender || null) as "male" | "female" | "non_binary" | "other" | null,
      sexual_orientation: form.sexual_orientation || null,
      hide_orientation: form.hide_orientation,
      training_level: (form.training_level || null) as "beginner" | "intermediate" | "advanced" | null,
      modalities: form.modalities,
      training_split: form.training_split || null,
      goal: (form.goal || null) as "friends" | "training_partner" | "romance" | null,
      available_hours: form.available_hours as ("morning" | "afternoon" | "night")[],
      hide_hours: form.hide_hours,
      interests: form.interests,
      gym_id: form.gym_ids[0],
    }).eq("id", user.id);
    if (error) { setBusy(false); return toast.error(error.message); }

    // Sincronizar vínculos de academias (diff)
    const toAdd = form.gym_ids.filter((id) => !initialGymIds.includes(id));
    const toRemove = initialGymIds.filter((id) => !form.gym_ids.includes(id));
    if (toRemove.length) {
      await supabase.from("user_gyms").delete().eq("user_id", user.id).in("gym_id", toRemove);
    }
    if (toAdd.length) {
      await supabase.from("user_gyms").insert(toAdd.map((gym_id) => ({ user_id: user.id, gym_id })));
    }
    // Log no histórico se houve mudança
    if (toAdd.length || toRemove.length) {
      const oldNames = allGyms.filter((g) => initialGymIds.includes(g.id)).map((g) => g.name);
      const newNames = allGyms.filter((g) => form.gym_ids.includes(g.id)).map((g) => g.name);
      await supabase.from("profile_history").insert({
        user_id: user.id,
        field_changed: "gym_units",
        old_value: JSON.stringify(oldNames),
        new_value: JSON.stringify(newNames),
      });
      setInitialGymIds(form.gym_ids);
    }

    setBusy(false);
    toast.success("Perfil atualizado com sucesso");
    await refreshProfile();
    nav({ to: "/me" });
  }

  const noPhoto = !form.photo_url;

  return (
    <div className="pb-16">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={() => nav({ to: "/me" })} aria-label="Voltar" className="rounded-full p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-base font-semibold">Editar perfil</h1>
        <button onClick={save} disabled={busy} className="rounded-full bg-gradient-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
          {busy ? "..." : "Salvar"}
        </button>
      </header>

      <div className="px-6 pt-6">
        <div className="flex flex-col items-center">
          <button type="button" onClick={() => setSheet(true)} className="relative">
            <div className="h-[120px] w-[120px] overflow-hidden rounded-full bg-muted ring-2 ring-border">
              {form.photo_url
                ? <img src={form.photo_url} alt="" className="h-full w-full object-cover" />
                : <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">Sem foto</div>}
            </div>
            <span className="absolute bottom-1 right-1 grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
              <Camera className="h-4 w-4" />
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          {uploading && <p className="mt-2 text-xs text-muted-foreground">Enviando...</p>}
          {noPhoto && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Seu perfil não aparecerá para outros membros até você adicionar uma foto.</p>
            </div>
          )}
        </div>

        <Section title="Informações pessoais">
          <Field label="Nome" error={nameError}>
            <input className="ipt" maxLength={60} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Gênero">
            <select className="ipt" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">Selecione</option>
              {GENDERS.map((g) => <option key={g.v} value={g.v}>{g.l}</option>)}
            </select>
          </Field>
          <Field label="Orientação sexual">
            <select className="ipt" value={form.sexual_orientation} onChange={(e) => setForm({ ...form, sexual_orientation: e.target.value })}>
              <option value="">Selecione</option>
              {ORIENTATIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <Toggle checked={form.hide_orientation} onChange={(v) => setForm({ ...form, hide_orientation: v })} label="Ocultar do meu perfil" />
          </Field>
        </Section>

        <Section title="Treino">
          <Field label="Nível de treino">
            <select className="ipt" value={form.training_level} onChange={(e) => setForm({ ...form, training_level: e.target.value })}>
              <option value="">Selecione</option>
              {LEVELS.map((l) => <option key={l.v} value={l.v}>{l.l}</option>)}
            </select>
          </Field>
          <Field label="Modalidades preferidas">
            <div className="flex flex-wrap gap-2">
              {MODALITIES.map((m) => (
                <Pill key={m} active={form.modalities.includes(m)} onClick={() => setForm({ ...form, modalities: toggle(form.modalities, m) })}>{m}</Pill>
              ))}
            </div>
          </Field>
          <Field label="Divisão de treino">
            <select className="ipt" value={form.training_split} onChange={(e) => setForm({ ...form, training_split: e.target.value })}>
              <option value="">Selecione</option>
              {SPLITS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </Section>

        <Section title="Objetivos e disponibilidade">
          <Field label="Objetivo">
            <select className="ipt" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}>
              <option value="">Selecione</option>
              {GOALS.map((g) => <option key={g.v} value={g.v}>{g.l}</option>)}
            </select>
          </Field>
          <Field label="Horários disponíveis">
            <div className="grid grid-cols-3 gap-2">
              {HOURS.map((h) => (
                <Pill key={h.v} active={form.available_hours.includes(h.v)} onClick={() => setForm({ ...form, available_hours: toggle(form.available_hours, h.v) })}>{h.l}</Pill>
              ))}
            </div>
            <Toggle checked={form.hide_hours} onChange={(v) => setForm({ ...form, hide_hours: v })} label="Ocultar do meu perfil" />
          </Field>
          <Field label={`Interesses (${form.interests.length}/5)`}>
            <div className="flex gap-2">
              <input className="ipt flex-1" value={interestInput} placeholder="Adicione e pressione Enter"
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addInterest(); } }} />
              <button type="button" onClick={addInterest} className="rounded-xl border border-border bg-card px-3 text-sm">Adicionar</button>
            </div>
            {form.interests.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.interests.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-sm">
                    {tag}
                    <button type="button" onClick={() => setForm({ ...form, interests: form.interests.filter((t) => t !== tag) })} aria-label="Remover">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>
        </Section>

        <Section title="Minhas academias">
          <p className="-mt-2 mb-2 text-xs text-muted-foreground">
            Você verá perfis de todas as academias selecionadas.
          </p>
          <input
            className="ipt"
            placeholder="Buscar academia..."
            value={gymSearch}
            onChange={(e) => setGymSearch(e.target.value)}
          />
          <div className="mt-3 max-h-72 space-y-1 overflow-y-auto rounded-2xl border border-border bg-card p-2">
            {allGyms
              .filter((g) => {
                const q = gymSearch.trim().toLowerCase();
                if (!q) return true;
                return g.name.toLowerCase().includes(q) || (g.address ?? "").toLowerCase().includes(q);
              })
              .map((g) => {
                const checked = form.gym_ids.includes(g.id);
                return (
                  <label key={g.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-accent">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setForm({ ...form, gym_ids: toggle(form.gym_ids, g.id) })}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{g.name}</div>
                      {g.address && <div className="truncate text-xs text-muted-foreground">{g.address}</div>}
                    </div>
                  </label>
                );
              })}
            {allGyms.length === 0 && <p className="p-3 text-xs text-muted-foreground">Nenhuma academia cadastrada.</p>}
          </div>
          {gymError && <p className="mt-1 text-xs text-destructive">{gymError}</p>}
        </Section>

        <Section title="Informações da conta">
          <LockedField label="Email" value={locked.email ?? "—"} />
          <LockedField label="CPF" value={locked.cpf ?? "—"} />
          <LockedField label="Telefone" value={locked.phone ?? "—"} />
          <LockedField label="Idade" value={locked.age != null ? String(locked.age) : "—"} />
          <p className="mt-2 text-xs text-muted-foreground">
            Estes campos não podem ser alterados após o cadastro. Entre em contato com o suporte caso haja algum erro.
          </p>
        </Section>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setSheet(false)}>
          <div className="w-full rounded-t-3xl bg-card p-2 pb-6" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-muted" />
            <button onClick={pickFromGallery} className="block w-full rounded-2xl px-4 py-4 text-left text-base hover:bg-accent">Escolher da galeria</button>
            {form.photo_url && (
              <button onClick={removePhoto} className="block w-full rounded-2xl px-4 py-4 text-left text-base text-destructive hover:bg-accent">Remover foto</button>
            )}
            <button onClick={() => setSheet(false)} className="mt-2 block w-full rounded-2xl bg-accent px-4 py-4 text-center text-base font-medium">Cancelar</button>
          </div>
        </div>
      )}

      <style>{`.ipt{width:100%;border-radius:1rem;border:1px solid var(--border);background:var(--card);padding:.85rem 1rem;color:var(--foreground);outline:none;font-size:1rem}`}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center justify-between rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <span className="truncate">{value}</span>
        <Lock className="ml-2 h-4 w-4 shrink-0" />
      </div>
    </div>
  );
}
function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-full border px-3 py-2 text-sm transition ${active ? "border-primary bg-gradient-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/50"}`}>
      {children}
    </button>
  );
}
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="mt-2 flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
