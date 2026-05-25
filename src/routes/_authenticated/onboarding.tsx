import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({ component: Onboarding });

const HOURS = ["morning", "afternoon", "night"] as const;
const GOALS = ["friends", "training_partner", "romance"] as const;
const GENDERS = ["male", "female", "non_binary", "other"] as const;
const LEVELS = ["beginner", "intermediate", "advanced"] as const;
const MODS = ["Musculação", "Crossfit", "Corrida", "Calistenia", "Yoga", "Boxe", "HIIT", "Natação"];

const LABELS: Record<string, string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  night: "Noite",
  friends: "Amizade",
  training_partner: "Parceiro de treino",
  romance: "Romance",
  male: "Masculino",
  female: "Feminino",
  non_binary: "Não-binário",
  other: "Outro",
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [gyms, setGyms] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    age: 18,
    gender: "" as "" | typeof GENDERS[number],
    cpf: "",
    sexual_orientation: "",
    interests: "",
    goal: "friends" as typeof GOALS[number],
    looking_for: ["friends"] as Array<typeof GOALS[number]>,
    gender_preference: [] as Array<typeof GENDERS[number]>,
    training_level: "beginner" as typeof LEVELS[number],
    available_hours: [] as Array<typeof HOURS[number]>,
    modalities: [] as string[],
    training_split: "",
    bio: "",
    gym_id: "",
    photoFile: null as File | null,
    terms: false,
  });

  useEffect(() => {
    supabase.from("gyms").select("id,name,qr_code").eq("active", true).then(({ data }) => {
      setGyms(data ?? []);
      const code = typeof window !== "undefined" ? sessionStorage.getItem("pending_gym_code") : null;
      if (code && data) {
        const g = data.find((x) => x.qr_code === code);
        if (g) setForm((f) => ({ ...f, gym_id: g.id }));
      }
    });
  }, []);

  async function finish() {
    if (!user) return;
    if (!form.terms) return toast.error("Aceite os Termos e a Política de Privacidade.");
    if (form.age < 18) return toast.error("Você precisa ter 18 anos ou mais para usar o GymMatch.");
    if (!form.gym_id) return toast.error("Selecione sua academia.");
    if (!form.photoFile) return toast.error("É obrigatório enviar uma foto de perfil.");
    setBusy(true);
    try {
      const ext = form.photoFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, form.photoFile, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error } = await supabase.from("profiles").update({
        name: form.name,
        phone: form.phone,
        age: form.age,
        gender: form.gender || null,
        cpf: form.cpf || null,
        sexual_orientation: form.sexual_orientation || null,
        interests: form.interests.split(",").map((s) => s.trim()).filter(Boolean),
        goal: form.goal,
        looking_for: form.looking_for,
        gender_preference: form.gender_preference,
        training_level: form.training_level,
        available_hours: form.available_hours,
        modalities: form.modalities,
        training_split: form.training_split || null,
        bio: form.bio || null,
        gym_id: form.gym_id,
        photo_url: urlData.publicUrl,
        profile_complete: true,
        terms_accepted_at: new Date().toISOString(),
      }).eq("id", user.id);
      if (error) throw error;
      // Garante entrada em user_gyms para que o Descobrir multi-academia funcione
      await supabase.from("user_gyms").upsert({ user_id: user.id, gym_id: form.gym_id }, { onConflict: "user_id,gym_id" });
      toast.success("Tudo pronto!");
      await refreshProfile();
      nav({ to: "/discover" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar o perfil");
    } finally {
      setBusy(false);
    }
  }

  const steps = [
    {
      title: "Sobre você",
      body: (
        <div className="space-y-3">
          <Field label="Nome completo"><input className="ipt" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Telefone"><input className="ipt" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Idade (18+)"><input type="number" min={18} className="ipt" value={form.age} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })} /></Field>
          <Field label="CPF"><input className="ipt" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></Field>
          <Field label="Gênero">
            <div className="grid grid-cols-2 gap-2">
              {GENDERS.map((g) => (
                <Pill key={g} active={form.gender === g} onClick={() => setForm({ ...form, gender: g })}>{labelOf(g)}</Pill>
              ))}
            </div>
          </Field>
          <Field label="Orientação sexual (opcional)"><input className="ipt" value={form.sexual_orientation} onChange={(e) => setForm({ ...form, sexual_orientation: e.target.value })} /></Field>
        </div>
      ),
    },
    {
      title: "O que você está procurando?",
      body: (
        <div className="space-y-3">
          <Field label="Objetivo principal">
            <div className="grid grid-cols-3 gap-2">
              {GOALS.map((g) => <Pill key={g} active={form.goal === g} onClick={() => setForm({ ...form, goal: g, looking_for: Array.from(new Set([...form.looking_for, g])) })}>{labelOf(g)}</Pill>)}
            </div>
          </Field>
          <Field label="Também aberto a">
            <div className="grid grid-cols-3 gap-2">
              {GOALS.map((g) => <Pill key={g} active={form.looking_for.includes(g)} onClick={() => setForm({ ...form, looking_for: toggle(form.looking_for, g) })}>{labelOf(g)}</Pill>)}
            </div>
          </Field>
          <Field label="Me mostre (para romance)">
            <div className="grid grid-cols-2 gap-2">
              {GENDERS.map((g) => <Pill key={g} active={form.gender_preference.includes(g)} onClick={() => setForm({ ...form, gender_preference: toggle(form.gender_preference, g) })}>{labelOf(g)}</Pill>)}
            </div>
          </Field>
        </div>
      ),
    },
    {
      title: "Seu treino",
      body: (
        <div className="space-y-3">
          <Field label="Nível">
            <div className="grid grid-cols-3 gap-2">
              {LEVELS.map((l) => <Pill key={l} active={form.training_level === l} onClick={() => setForm({ ...form, training_level: l })}>{labelOf(l)}</Pill>)}
            </div>
          </Field>
          <Field label="Quando você treina">
            <div className="grid grid-cols-3 gap-2">
              {HOURS.map((h) => <Pill key={h} active={form.available_hours.includes(h)} onClick={() => setForm({ ...form, available_hours: toggle(form.available_hours, h) })}>{labelOf(h)}</Pill>)}
            </div>
          </Field>
          <Field label="Modalidades">
            <div className="flex flex-wrap gap-2">
              {MODS.map((m) => <Pill key={m} active={form.modalities.includes(m)} onClick={() => setForm({ ...form, modalities: toggle(form.modalities, m) })}>{m}</Pill>)}
            </div>
          </Field>
          <Field label="Divisão de treino (ex: Push/Pull/Legs)"><input className="ipt" value={form.training_split} onChange={(e) => setForm({ ...form, training_split: e.target.value })} /></Field>
          <Field label="Interesses (separados por vírgula)"><input className="ipt" value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} /></Field>
        </div>
      ),
    },
    {
      title: "Sua academia e foto",
      body: (
        <div className="space-y-3">
          <Field label="Academia">
            <select className="ipt" value={form.gym_id} onChange={(e) => setForm({ ...form, gym_id: e.target.value })}>
              <option value="">Selecione a academia...</option>
              {gyms.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <Field label="Bio (opcional)"><textarea rows={3} className="ipt" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></Field>
          <Field label="Foto de perfil">
            <input type="file" accept="image/*" className="ipt" onChange={(e) => setForm({ ...form, photoFile: e.target.files?.[0] ?? null })} />
            {form.photoFile && <p className="mt-1 text-xs text-muted-foreground">{form.photoFile.name}</p>}
          </Field>
          <label className="flex items-start gap-3 cursor-pointer">
            <button
              type="button"
              role="checkbox"
              aria-checked={form.terms}
              onClick={() => setForm({ ...form, terms: !form.terms })}
              className={`mt-0.5 shrink-0 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${
                form.terms ? "border-primary bg-gradient-primary" : "border-border bg-transparent"
              }`}
            >
              {form.terms && (
                <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2,6 5,9 10,3" />
                </svg>
              )}
            </button>
            <span className="text-sm text-muted-foreground leading-snug">
              Tenho 18 anos ou mais e aceito os Termos de Uso e a Política de Privacidade (LGPD).
            </span>
          </label>
        </div>
      ),
    },
  ];

  const current = steps[step];

  return (
    <div className="mx-auto min-h-screen max-w-md px-6 py-8">
      {/* Progress */}
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= step ? "bg-gradient-primary" : "bg-muted"}`} />
        ))}
      </div>

      <p className="mt-4 text-xs font-medium text-muted-foreground tracking-wide">
        ETAPA {step + 1} DE {steps.length}
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">{current.title}</h1>

      <div className="mt-6">{current.body}</div>

      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)}
            className="flex-1 rounded-2xl border border-border/70 bg-card py-3.5 text-sm font-semibold hover:bg-accent transition-colors">
            Voltar
          </button>
        )}
        {step < steps.length - 1 ? (
          <button onClick={() => setStep(step + 1)}
            className="flex-1 rounded-2xl bg-gradient-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-glow">
            Avançar
          </button>
        ) : (
          <button disabled={busy} onClick={finish}
            className="flex-1 rounded-2xl bg-gradient-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50">
            {busy ? "Salvando…" : "Concluir"}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-foreground/80">{label}</span>
      {children}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-150 ${
        active
          ? "border-primary bg-gradient-primary text-white shadow-glow"
          : "border-border/70 bg-card text-foreground/80 hover:border-primary/40"
      }`}>
      {children}
    </button>
  );
}

function labelOf(s: string) {
  return LABELS[s] ?? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
