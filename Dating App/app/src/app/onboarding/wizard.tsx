"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "./upload-helpers";
import { friendlyErrorMessage } from "@/lib/error-messages";
import type { Enums } from "@/lib/supabase/types";

/**
 * The onboarding wizard (spec section 2.1). Each step writes directly to
 * Supabase from the browser under RLS ("own row" policies, spec section
 * 6.3); only the two upload steps touch the server action in actions.ts,
 * since that's the only part needing the secret key and Sharp.
 *
 * Every step hydrates its fields from whatever is already saved (fetched
 * once, below) before rendering, so using Back and then Continue again
 * re-submits what's actually there instead of silently overwriting saved
 * answers -- including consent-linked ones like genotype -- with a
 * step's hardcoded defaults.
 *
 * Non-negotiables, heritage, and health are simplified for this first
 * pass: functional and correct, not the full richness the spec describes
 * for later polish (e.g. heritage values are entered as one comma-
 * separated field per type rather than a rich multi-chip input, and a
 * "must match" toggle accepts only the value the user themselves chose,
 * not a separate multi-select of acceptable answers).
 */

const STEPS = [
  "age",
  "consent",
  "basics",
  "prompts",
  "capacity",
  "non-negotiables",
  "heritage",
  "health",
  "photos",
  "selfie",
  "review",
] as const;
type Step = (typeof STEPS)[number];

const CONSENT_VERSION = "1";

const HERITAGE_FIELDS: { key: Enums<"heritage_field">; label: string }[] = [
  { key: "background", label: "Background" },
  { key: "community", label: "Community or tribe" },
  { key: "origin_country", label: "Family origin country" },
  { key: "origin_region", label: "Region, island, or state" },
  { key: "language", label: "Languages spoken" },
  { key: "raised_in", label: "Raised in" },
];

const PROMPTS: { id: string; text: string }[] = [
  { id: "looking_for", text: "Right now, I'm looking for..." },
  { id: "weekend", text: "A weekend well spent looks like..." },
  { id: "known_for", text: "People who know me would say I'm..." },
];

type WizardData = {
  profile: {
    first_name: string | null;
    gender: Enums<"gender"> | null;
    gender_label: string | null;
    city_label: string | null;
    occupation: string | null;
    education: Enums<"education"> | null;
    height_cm: number | null;
    capacity: number;
    show_heritage: boolean;
    prompts: { prompt_id: string; answer: string }[] | null;
  } | null;
  sensitive: { seeking: Enums<"seeking"> | null } | null;
  answers: {
    goal: Enums<"goal"> | null;
    kids: Enums<"kids"> | null;
    faith_label: string | null;
    faith_practice: Enums<"practice"> | null;
    politics: Enums<"politics"> | null;
    smoking: Enums<"habit"> | null;
    drinking: Enums<"habit"> | null;
    timeline: Enums<"timeline"> | null;
    relocate: Enums<"relocate"> | null;
    income_band: Enums<"income_band"> | null;
    health_section_enabled: boolean;
    genotype: Enums<"genotype"> | null;
  } | null;
  preferences: {
    kids_must: boolean;
    faith_key_must: boolean;
    practice_must: boolean;
    politics_must: boolean;
    smoking_must: boolean;
    drinking_must: boolean;
    use_heritage: boolean;
  } | null;
  heritage: { field: Enums<"heritage_field">; value: string }[];
  heritagePrefs: { field: Enums<"heritage_field">; mode: Enums<"pref_mode"> }[];
  photos: { position: number }[];
  verification: { id: string; pose_code: string; selfie_path: string | null } | null;
};

export default function OnboardingWizard() {
  const router = useRouter();
  const supabase = createClient();
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<WizardData | null>(null);
  const step: Step = STEPS[stepIndex];

  // Re-run before every step transition (not just once at mount): a single
  // upfront fetch would only reflect what was saved in a *previous*
  // session, going stale the instant this session's own steps started
  // saving -- which reintroduces the exact "Back re-submits stale
  // defaults" bug this hydration was meant to fix, just one step later.
  // Fetching again right before showing the next/previous step keeps
  // whatever renders always caught up with the database.
  async function loadData(): Promise<WizardData | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const uid = user.id;
    const [profileRes, sensitiveRes, answersRes, preferencesRes, heritageRes, heritagePrefsRes, photosRes, verificationRes] =
      await Promise.all([
        supabase
          .from("profiles")
          .select(
            "first_name, gender, gender_label, city_label, occupation, education, height_cm, capacity, show_heritage, prompts",
          )
          .eq("id", uid)
          .maybeSingle(),
        supabase.from("profile_sensitive").select("seeking").eq("profile_id", uid).maybeSingle(),
        supabase
          .from("profile_answers")
          .select(
            "goal, kids, faith_label, faith_practice, politics, smoking, drinking, timeline, relocate, income_band, health_section_enabled, genotype",
          )
          .eq("profile_id", uid)
          .maybeSingle(),
        supabase
          .from("preferences")
          .select("kids_must, faith_key_must, practice_must, politics_must, smoking_must, drinking_must, use_heritage")
          .eq("profile_id", uid)
          .maybeSingle(),
        supabase.from("profile_heritage").select("field, value").eq("profile_id", uid),
        supabase.from("heritage_preferences").select("field, mode").eq("profile_id", uid),
        supabase.from("photos").select("position").eq("profile_id", uid),
        supabase
          .from("verifications")
          .select("id, pose_code, selfie_path")
          .eq("profile_id", uid)
          .is("decision", null)
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    return {
      profile: profileRes.data as WizardData["profile"],
      sensitive: sensitiveRes.data,
      answers: answersRes.data as WizardData["answers"],
      preferences: preferencesRes.data,
      heritage: heritageRes.data ?? [],
      heritagePrefs: heritagePrefsRes.data ?? [],
      photos: photosRes.data ?? [],
      verification: verificationRes.data,
    };
  }

  useEffect(() => {
    (async () => {
      const fresh = await loadData();
      if (fresh) setData(fresh);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function next() {
    setError(null);
    setBusy(true);
    const fresh = await loadData();
    if (fresh) setData(fresh);
    setBusy(false);
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }
  async function back() {
    setError(null);
    setBusy(true);
    const fresh = await loadData();
    if (fresh) setData(fresh);
    setBusy(false);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function run(fn: () => Promise<{ error?: { message: string } | null } | void>) {
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      if (result && "error" in result && result.error) {
        setError(friendlyErrorMessage(result.error.message));
        return false;
      }
      return true;
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-10">
        <p className="text-sm text-gray-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-10">
      <div className="text-sm text-gray-400">
        Step {stepIndex + 1} of {STEPS.length}
      </div>

      {step === "age" && <AgeStep supabase={supabase} run={run} onNext={next} />}
      {step === "consent" && <ConsentStep supabase={supabase} run={run} onNext={next} />}
      {step === "basics" && (
        <BasicsStep supabase={supabase} run={run} onNext={next} onBack={back} initial={data.profile} initialSeeking={data.sensitive?.seeking ?? null} />
      )}
      {step === "prompts" && (
        <PromptsStep supabase={supabase} run={run} onNext={next} onBack={back} initial={data.profile?.prompts ?? null} />
      )}
      {step === "capacity" && (
        <CapacityStep supabase={supabase} run={run} onNext={next} onBack={back} initial={data.profile?.capacity ?? 1} />
      )}
      {step === "non-negotiables" && (
        <NonNegotiablesStep
          supabase={supabase}
          run={run}
          onNext={next}
          onBack={back}
          initialAnswers={data.answers}
          initialPreferences={data.preferences}
        />
      )}
      {step === "heritage" && (
        <HeritageStep
          supabase={supabase}
          run={run}
          onNext={next}
          onBack={back}
          initialShowHeritage={data.profile?.show_heritage ?? true}
          initialUseHeritage={data.preferences?.use_heritage ?? false}
          initialHeritage={data.heritage}
          initialHeritagePrefs={data.heritagePrefs}
        />
      )}
      {step === "health" && <HealthStep supabase={supabase} run={run} onNext={next} onBack={back} initial={data.answers} />}
      {step === "photos" && <PhotosStep supabase={supabase} onNext={next} onBack={back} initialPhotos={data.photos} />}
      {step === "selfie" && <SelfieStep supabase={supabase} onNext={next} onBack={back} initial={data.verification} />}
      {step === "review" && <ReviewStep supabase={supabase} run={run} onBack={back} onDone={() => router.push("/onboarding/pending")} />}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {busy && <p className="text-sm text-gray-400">Saving...</p>}
    </main>
  );
}

type RunFn = (fn: () => Promise<{ error?: { message: string } | null } | void>) => Promise<boolean>;
type SB = ReturnType<typeof createClient>;

function AgeStep({ supabase, run, onNext }: { supabase: SB; run: RunFn; onNext: () => void }) {
  const [birthDate, setBirthDate] = useState("");
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(async () => {
          const { data, error } = await supabase.rpc("attempt_set_birth_date", { p_birth_date: birthDate });
          if (error) return { error };
          const result = data as { ok: boolean; code?: string };
          if (!result.ok) return { error: { message: result.code ?? "underage" } };
          return {};
        });
        if (ok) onNext();
      }}
    >
      <h2 className="text-lg font-medium">When were you born?</h2>
      <p className="text-sm text-gray-500">You must be 18 or older to use Focus.</p>
      <input
        type="date"
        required
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        className="rounded border border-gray-300 px-3 py-2"
      />
      <button className="rounded bg-black px-3 py-2 text-white">Continue</button>
    </form>
  );
}

function ConsentStep({ supabase, run, onNext }: { supabase: SB; run: RunFn; onNext: () => void }) {
  const [agreed, setAgreed] = useState({ terms: false, privacy: false, sensitive: false });
  const allChecked = agreed.terms && agreed.privacy && agreed.sensitive;
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(async () => {
          const calls = [
            supabase.rpc("record_consent", { kind: "terms", version: CONSENT_VERSION, action: "accepted" }),
            supabase.rpc("record_consent", { kind: "privacy", version: CONSENT_VERSION, action: "accepted" }),
            supabase.rpc("record_consent", {
              kind: "sensitive_data",
              version: CONSENT_VERSION,
              action: "accepted",
            }),
          ];
          const results = await Promise.all(calls);
          const failed = results.find((r) => r.error);
          return { error: failed?.error };
        });
        if (ok) onNext();
      }}
    >
      <h2 className="text-lg font-medium">Before we continue</h2>
      <p className="text-sm text-gray-500">
        Focus will collect some sensitive information (faith, heritage, who you want to meet,
        politics) to help match you well. It is never sold, and you can delete it at any time.
      </p>
      <Checkbox
        checked={agreed.terms}
        onChange={(v) => setAgreed((a) => ({ ...a, terms: v }))}
        label="I agree to the Terms of Service."
      />
      <Checkbox
        checked={agreed.privacy}
        onChange={(v) => setAgreed((a) => ({ ...a, privacy: v }))}
        label="I agree to the Privacy Policy."
      />
      <Checkbox
        checked={agreed.sensitive}
        onChange={(v) => setAgreed((a) => ({ ...a, sensitive: v }))}
        label="I consent to Focus collecting sensitive information for matching."
      />
      <button disabled={!allChecked} className="rounded bg-black px-3 py-2 text-white disabled:opacity-50">
        Continue
      </button>
    </form>
  );
}

function BasicsStep({
  supabase,
  run,
  onNext,
  onBack,
  initial,
  initialSeeking,
}: {
  supabase: SB;
  run: RunFn;
  onNext: () => void;
  onBack: () => void;
  initial: WizardData["profile"];
  initialSeeking: Enums<"seeking"> | null;
}) {
  const [firstName, setFirstName] = useState(initial?.first_name ?? "");
  const [gender, setGender] = useState<Enums<"gender">>(initial?.gender ?? "woman");
  const [genderLabel, setGenderLabel] = useState(initial?.gender_label ?? "");
  const [seeking, setSeeking] = useState<Enums<"seeking">>(initialSeeking ?? "everyone");
  const [cityLabel, setCityLabel] = useState(initial?.city_label ?? "");
  const [occupation, setOccupation] = useState(initial?.occupation ?? "");
  const [education, setEducation] = useState<Enums<"education"> | "">(initial?.education ?? "");
  const [heightCm, setHeightCm] = useState(initial?.height_cm != null ? String(initial.height_cm) : "");

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(async () => {
          const uid = (await supabase.auth.getUser()).data.user!.id;
          const { error: e1 } = await supabase
            .from("profiles")
            .update({
              first_name: firstName,
              gender,
              gender_label: gender === "self_described" ? genderLabel : null,
              city_label: cityLabel,
              occupation: occupation || null,
              education: education || null,
              height_cm: heightCm ? Number(heightCm) : null,
            })
            .eq("id", uid);
          const { error: e2 } = await supabase
            .from("profile_sensitive")
            .update({ seeking })
            .eq("profile_id", uid);
          return { error: e1 ?? e2 };
        });
        if (ok) onNext();
      }}
    >
      <h2 className="text-lg font-medium">The basics</h2>
      <Field label="First name">
        <input
          required
          maxLength={30}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </Field>
      <Field label="Gender">
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value as Enums<"gender">)}
          className="rounded border border-gray-300 px-3 py-2"
        >
          <option value="woman">Woman</option>
          <option value="man">Man</option>
          <option value="nonbinary">Nonbinary</option>
          <option value="self_described">Self-described</option>
        </select>
      </Field>
      {gender === "self_described" && (
        <input
          required
          maxLength={30}
          value={genderLabel}
          onChange={(e) => setGenderLabel(e.target.value)}
          placeholder="How would you describe it?"
          className="rounded border border-gray-300 px-3 py-2"
        />
      )}
      <Field label="Who are you looking to meet">
        <select
          value={seeking}
          onChange={(e) => setSeeking(e.target.value as Enums<"seeking">)}
          className="rounded border border-gray-300 px-3 py-2"
        >
          <option value="women">Women</option>
          <option value="men">Men</option>
          <option value="everyone">Everyone</option>
        </select>
      </Field>
      <Field label="City">
        <input
          required
          maxLength={60}
          value={cityLabel}
          onChange={(e) => setCityLabel(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </Field>
      <Field label="Occupation (optional)">
        <input
          maxLength={80}
          value={occupation}
          onChange={(e) => setOccupation(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </Field>
      <Field label="Education (optional)">
        <select
          value={education}
          onChange={(e) => setEducation(e.target.value as Enums<"education"> | "")}
          className="rounded border border-gray-300 px-3 py-2"
        >
          <option value="">Prefer not to say</option>
          <option value="high_school">High school</option>
          <option value="some_college">Some college</option>
          <option value="bachelors">Bachelor&apos;s</option>
          <option value="masters">Master&apos;s</option>
          <option value="doctorate">Doctorate</option>
          <option value="trade">Trade school</option>
          <option value="other">Other</option>
        </select>
      </Field>
      <Field label="Height in cm (optional)">
        <input
          type="number"
          min={120}
          max={230}
          value={heightCm}
          onChange={(e) => setHeightCm(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </Field>
      <StepButtons onBack={onBack} />
    </form>
  );
}

function PromptsStep({
  supabase,
  run,
  onNext,
  onBack,
  initial,
}: {
  supabase: SB;
  run: RunFn;
  onNext: () => void;
  onBack: () => void;
  initial: { prompt_id: string; answer: string }[] | null;
}) {
  const [answers, setAnswers] = useState<string[]>(() => {
    const byId = new Map((initial ?? []).map((p) => [p.prompt_id, p.answer]));
    return PROMPTS.map((p) => byId.get(p.id) ?? "");
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(async () => {
          const uid = (await supabase.auth.getUser()).data.user!.id;
          const prompts = PROMPTS.map((p, i) => ({ prompt_id: p.id, answer: answers[i].trim() }));
          const { error } = await supabase.from("profiles").update({ prompts }).eq("id", uid);
          return { error };
        });
        if (ok) onNext();
      }}
    >
      <h2 className="text-lg font-medium">A few prompts</h2>
      <p className="text-sm text-gray-500">Three short answers instead of a free-form bio.</p>
      {PROMPTS.map((p, i) => (
        <Field key={p.id} label={p.text}>
          <input
            required
            minLength={1}
            maxLength={200}
            value={answers[i]}
            onChange={(e) => setAnswers((a) => a.map((v, j) => (j === i ? e.target.value : v)))}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </Field>
      ))}
      <StepButtons onBack={onBack} />
    </form>
  );
}

function CapacityStep({
  supabase,
  run,
  onNext,
  onBack,
  initial,
}: {
  supabase: SB;
  run: RunFn;
  onNext: () => void;
  onBack: () => void;
  initial: number;
}) {
  const [capacity, setCapacity] = useState(initial);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(async () => {
          const uid = (await supabase.auth.getUser()).data.user!.id;
          const { error } = await supabase.from("profiles").update({ capacity }).eq("id", uid);
          return { error };
        });
        if (ok) onNext();
      }}
    >
      <h2 className="text-lg font-medium">How many people can you genuinely get to know at once?</h2>
      <p className="text-sm text-gray-500">
        This is a ceiling, not a target. You can change it any time, and having room does not mean
        you have to use it.
      </p>
      {[1, 2, 3].map((n) => (
        <label key={n} className="flex items-center gap-2">
          <input
            type="radio"
            name="capacity"
            checked={capacity === n}
            onChange={() => setCapacity(n)}
          />
          {n} {n === 1 ? "(deep focus)" : n === 2 ? "(balanced)" : "(open exploration)"}
        </label>
      ))}
      <StepButtons onBack={onBack} />
    </form>
  );
}

function NonNegotiablesStep({
  supabase,
  run,
  onNext,
  onBack,
  initialAnswers,
  initialPreferences,
}: {
  supabase: SB;
  run: RunFn;
  onNext: () => void;
  onBack: () => void;
  initialAnswers: WizardData["answers"];
  initialPreferences: WizardData["preferences"];
}) {
  const [goal, setGoal] = useState<Enums<"goal">>(initialAnswers?.goal ?? "serious_relationship");
  const [kids, setKids] = useState<Enums<"kids">>(initialAnswers?.kids ?? "open");
  const [kidsMust, setKidsMust] = useState(initialPreferences?.kids_must ?? false);
  const [faithLabel, setFaithLabel] = useState(initialAnswers?.faith_label ?? "");
  const [faithMust, setFaithMust] = useState(initialPreferences?.faith_key_must ?? false);
  const [faithPractice, setFaithPractice] = useState<Enums<"practice">>(initialAnswers?.faith_practice ?? "cultural");
  const [practiceMust, setPracticeMust] = useState(initialPreferences?.practice_must ?? false);
  const [politics, setPolitics] = useState<Enums<"politics">>(initialAnswers?.politics ?? "prefer_not");
  const [politicsMust, setPoliticsMust] = useState(initialPreferences?.politics_must ?? false);
  const [smoking, setSmoking] = useState<Enums<"habit">>(initialAnswers?.smoking ?? "never");
  const [smokingMust, setSmokingMust] = useState(initialPreferences?.smoking_must ?? false);
  const [drinking, setDrinking] = useState<Enums<"habit">>(initialAnswers?.drinking ?? "sometimes");
  const [drinkingMust, setDrinkingMust] = useState(initialPreferences?.drinking_must ?? false);
  const [timeline, setTimeline] = useState<Enums<"timeline"> | "">(initialAnswers?.timeline ?? "");
  const [relocate, setRelocate] = useState<Enums<"relocate"> | "">(initialAnswers?.relocate ?? "");
  const [incomeBand, setIncomeBand] = useState<Enums<"income_band"> | "">(initialAnswers?.income_band ?? "");

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(async () => {
          const uid = (await supabase.auth.getUser()).data.user!.id;
          const trimmedFaith = faithLabel.trim();
          const { error: e1 } = await supabase
            .from("profile_answers")
            .update({
              goal,
              kids,
              faith_label: trimmedFaith || null,
              faith_practice: faithPractice,
              politics,
              smoking,
              drinking,
              timeline: timeline || null,
              relocate: relocate || null,
              income_band: incomeBand || null,
            })
            .eq("profile_id", uid);
          if (e1) return { error: e1 };

          // faith_key_accept needs the server-normalized key, not a
          // client-side approximation of normalize_key (which folds
          // diacritics via unaccent -- not worth re-implementing in JS).
          const { data: refreshed } = await supabase
            .from("profile_answers")
            .select("faith_key")
            .eq("profile_id", uid)
            .single();
          const faithKey = refreshed?.faith_key ?? null;
          const faithMustEffective = faithMust && Boolean(faithKey);

          const { error: e2 } = await supabase
            .from("preferences")
            .update({
              kids_must: kidsMust,
              kids_accept: kidsMust ? [kids] : [],
              faith_key_must: faithMustEffective,
              faith_key_accept: faithMustEffective && faithKey ? [faithKey] : [],
              practice_must: practiceMust,
              practice_accept: practiceMust ? [faithPractice] : [],
              politics_must: politicsMust,
              politics_accept: politicsMust ? [politics] : [],
              smoking_must: smokingMust,
              smoking_accept: smokingMust ? [smoking] : [],
              drinking_must: drinkingMust,
              drinking_accept: drinkingMust ? [drinking] : [],
            })
            .eq("profile_id", uid);
          return { error: e2 };
        });
        if (ok) onNext();
      }}
    >
      <h2 className="text-lg font-medium">What matters most</h2>
      <Field label="What are you looking for">
        <select value={goal} onChange={(e) => setGoal(e.target.value as Enums<"goal">)} className="rounded border border-gray-300 px-3 py-2">
          <option value="marriage">Marriage</option>
          <option value="life_partner">A life partner</option>
          <option value="serious_relationship">A serious relationship</option>
        </select>
      </Field>
      <Field label="Kids">
        <select value={kids} onChange={(e) => setKids(e.target.value as Enums<"kids">)} className="rounded border border-gray-300 px-3 py-2">
          <option value="want">Want kids</option>
          <option value="dont_want">Don&apos;t want kids</option>
          <option value="open">Open either way</option>
          <option value="have_want_more">Have kids, want more</option>
          <option value="have_done">Have kids, not looking for more</option>
        </select>
      </Field>
      <Checkbox checked={kidsMust} onChange={setKidsMust} label="This is a must-match for me" />

      <Field label="Faith (optional label)">
        <input value={faithLabel} onChange={(e) => setFaithLabel(e.target.value)} maxLength={40} className="rounded border border-gray-300 px-3 py-2" placeholder="e.g. Christian, Muslim, none" />
      </Field>
      <Field label="Practice level">
        <select value={faithPractice} onChange={(e) => setFaithPractice(e.target.value as Enums<"practice">)} className="rounded border border-gray-300 px-3 py-2">
          <option value="devout">Devout</option>
          <option value="practicing">Practicing</option>
          <option value="cultural">Cultural</option>
          <option value="not_practicing">Not practicing</option>
        </select>
      </Field>
      <Checkbox
        checked={faithMust && Boolean(faithLabel.trim())}
        onChange={setFaithMust}
        label={faithLabel.trim() ? "Faith label is a must-match for me" : "Faith label is a must-match for me (enter a label above first)"}
      />
      <Checkbox checked={practiceMust} onChange={setPracticeMust} label="Practice level is a must-match for me" />

      <Field label="Politics">
        <select value={politics} onChange={(e) => setPolitics(e.target.value as Enums<"politics">)} className="rounded border border-gray-300 px-3 py-2">
          <option value="liberal">Liberal</option>
          <option value="moderate">Moderate</option>
          <option value="conservative">Conservative</option>
          <option value="other">Other</option>
          <option value="prefer_not">Prefer not to say</option>
        </select>
      </Field>
      <Checkbox checked={politicsMust} onChange={setPoliticsMust} label="This is a must-match for me" />

      <Field label="Smoking">
        <select value={smoking} onChange={(e) => setSmoking(e.target.value as Enums<"habit">)} className="rounded border border-gray-300 px-3 py-2">
          <option value="never">Never</option>
          <option value="sometimes">Sometimes</option>
          <option value="regularly">Regularly</option>
        </select>
      </Field>
      <Checkbox checked={smokingMust} onChange={setSmokingMust} label="This is a must-match for me" />

      <Field label="Drinking">
        <select value={drinking} onChange={(e) => setDrinking(e.target.value as Enums<"habit">)} className="rounded border border-gray-300 px-3 py-2">
          <option value="never">Never</option>
          <option value="sometimes">Sometimes</option>
          <option value="regularly">Regularly</option>
        </select>
      </Field>
      <Checkbox checked={drinkingMust} onChange={setDrinkingMust} label="This is a must-match for me" />

      <Field label="Timeline">
        <select value={timeline} onChange={(e) => setTimeline(e.target.value as Enums<"timeline"> | "")} className="rounded border border-gray-300 px-3 py-2">
          <option value="">Prefer not to say</option>
          <option value="ready_now">Ready now</option>
          <option value="within_year">Within a year</option>
          <option value="exploring">Exploring slowly</option>
        </select>
      </Field>
      <Field label="Would you relocate">
        <select value={relocate} onChange={(e) => setRelocate(e.target.value as Enums<"relocate"> | "")} className="rounded border border-gray-300 px-3 py-2">
          <option value="">Prefer not to say</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="maybe">Maybe</option>
        </select>
      </Field>
      <Field label="Income band (optional, never filters)">
        <select value={incomeBand} onChange={(e) => setIncomeBand(e.target.value as Enums<"income_band"> | "")} className="rounded border border-gray-300 px-3 py-2">
          <option value="">Prefer not to say</option>
          <option value="under_40k">Under $40k</option>
          <option value="b40_80k">$40k-$80k</option>
          <option value="b80_150k">$80k-$150k</option>
          <option value="b150_300k">$150k-$300k</option>
          <option value="over_300k">Over $300k</option>
        </select>
      </Field>
      <p className="text-xs text-gray-400">
        Timeline, relocation, and income are shown on your profile but never used to filter who you see.
      </p>
      <StepButtons onBack={onBack} />
    </form>
  );
}

function HeritageStep({
  supabase,
  run,
  onNext,
  onBack,
  initialShowHeritage,
  initialUseHeritage,
  initialHeritage,
  initialHeritagePrefs,
}: {
  supabase: SB;
  run: RunFn;
  onNext: () => void;
  onBack: () => void;
  initialShowHeritage: boolean;
  initialUseHeritage: boolean;
  initialHeritage: { field: Enums<"heritage_field">; value: string }[];
  initialHeritagePrefs: { field: Enums<"heritage_field">; mode: Enums<"pref_mode"> }[];
}) {
  const [useHeritage, setUseHeritage] = useState(initialUseHeritage);
  const [showHeritage, setShowHeritage] = useState(initialShowHeritage);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const grouped = new Map<string, string[]>();
    for (const row of initialHeritage) {
      const list = grouped.get(row.field) ?? [];
      list.push(row.value);
      grouped.set(row.field, list);
    }
    return Object.fromEntries(HERITAGE_FIELDS.map(({ key }) => [key, (grouped.get(key) ?? []).join(", ")]));
  });
  const [modes, setModes] = useState<Record<string, Enums<"pref_mode">>>(() => {
    const byField = new Map(initialHeritagePrefs.map((p) => [p.field, p.mode]));
    return Object.fromEntries(HERITAGE_FIELDS.map(({ key }) => [key, byField.get(key) ?? "nice_to_have"]));
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(async () => {
          const uid = (await supabase.auth.getUser()).data.user!.id;
          const { error: e1 } = await supabase
            .from("profiles")
            .update({ show_heritage: showHeritage })
            .eq("id", uid);
          const { error: e2 } = await supabase
            .from("preferences")
            .update({ use_heritage: useHeritage })
            .eq("profile_id", uid);
          if (e1 || e2) return { error: e1 ?? e2 };

          const existingByField = new Map<string, string[]>();
          for (const row of initialHeritage) {
            const list = existingByField.get(row.field) ?? [];
            list.push(row.value);
            existingByField.set(row.field, list);
          }

          for (const { key } of HERITAGE_FIELDS) {
            const desired = (values[key] ?? "")
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean)
              .slice(0, 5);
            const existing = existingByField.get(key) ?? [];
            const toRemove = existing.filter((v) => !desired.includes(v));

            if (desired.length > 0) {
              const { error } = await supabase
                .from("profile_heritage")
                .upsert(desired.map((value) => ({ profile_id: uid, field: key, value, value_key: "" })));
              if (error) return { error };
            }
            if (toRemove.length > 0) {
              const { error } = await supabase
                .from("profile_heritage")
                .delete()
                .eq("profile_id", uid)
                .eq("field", key)
                .in("value", toRemove);
              if (error) return { error };
            }
          }

          // Per-field importance (spec 2.3): nice_to_have/important/must,
          // with the acceptable values defaulting to the user's own
          // entered values for that field -- self-referential ("a Haitian
          // who wants a Haitian"), not a separately typed acceptance list.
          // Fetch back the server-normalized value_keys rather than
          // re-deriving normalize_key's diacritic-folding in JS.
          const { data: rows, error: fetchError } = await supabase
            .from("profile_heritage")
            .select("field, value_key")
            .eq("profile_id", uid);
          if (fetchError) return { error: fetchError };

          const keysByField = new Map<string, string[]>();
          for (const row of rows ?? []) {
            const list = keysByField.get(row.field) ?? [];
            list.push(row.value_key);
            keysByField.set(row.field, list);
          }

          for (const { key } of HERITAGE_FIELDS) {
            const keys = keysByField.get(key) ?? [];
            if (useHeritage && keys.length > 0) {
              const { error } = await supabase
                .from("heritage_preferences")
                .upsert({ profile_id: uid, field: key, mode: modes[key], accept_keys: keys.slice(0, 10) });
              if (error) return { error };
            } else {
              const { error } = await supabase
                .from("heritage_preferences")
                .delete()
                .eq("profile_id", uid)
                .eq("field", key);
              if (error) return { error };
            }
          }

          return {};
        });
        if (ok) onNext();
      }}
    >
      <h2 className="text-lg font-medium">Heritage (optional)</h2>
      <p className="text-sm text-gray-500">
        Self-written, on your terms. This only affects matching if you turn it on below.
      </p>
      {HERITAGE_FIELDS.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-1">
          <Field label={label}>
            <input
              value={values[key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              placeholder="Comma-separated, up to 5"
              className="rounded border border-gray-300 px-3 py-2"
            />
          </Field>
          {useHeritage && (values[key] ?? "").trim().length > 0 && (
            <label className="flex items-center gap-2 text-sm text-gray-600">
              How important
              <select
                value={modes[key]}
                onChange={(e) => setModes((m) => ({ ...m, [key]: e.target.value as Enums<"pref_mode"> }))}
                className="rounded border border-gray-300 px-2 py-1"
              >
                <option value="nice_to_have">Nice to have</option>
                <option value="important">Important</option>
                <option value="must">Must match</option>
              </select>
            </label>
          )}
        </div>
      ))}
      <Checkbox checked={showHeritage} onChange={setShowHeritage} label="Show my heritage on my profile" />
      <Checkbox checked={useHeritage} onChange={setUseHeritage} label="Use heritage in who I'm shown" />
      <StepButtons onBack={onBack} />
    </form>
  );
}

function HealthStep({
  supabase,
  run,
  onNext,
  onBack,
  initial,
}: {
  supabase: SB;
  run: RunFn;
  onNext: () => void;
  onBack: () => void;
  initial: WizardData["answers"];
}) {
  const [enabled, setEnabled] = useState(initial?.health_section_enabled ?? false);
  const [genotype, setGenotype] = useState<Enums<"genotype">>(initial?.genotype ?? "unknown");

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(async () => {
          const uid = (await supabase.auth.getUser()).data.user!.id;
          if (!enabled) {
            const { error } = await supabase
              .from("profile_answers")
              .update({ health_section_enabled: false, genotype: null })
              .eq("profile_id", uid);
            return { error };
          }
          const { error: consentError } = await supabase.rpc("record_consent", {
            kind: "genotype_data",
            version: CONSENT_VERSION,
            action: "accepted",
          });
          if (consentError) return { error: consentError };
          const { error } = await supabase
            .from("profile_answers")
            .update({ health_section_enabled: true, genotype })
            .eq("profile_id", uid);
          return { error };
        });
        if (ok) onNext();
      }}
    >
      <h2 className="text-lg font-medium">Health compatibility (optional)</h2>
      <p className="text-sm text-gray-500">
        Some people choose to consider inherited blood conditions when dating seriously. This is
        optional and sensitive. Focus never infers it and does not require it.
      </p>
      <Checkbox checked={enabled} onChange={setEnabled} label="I want to include this" />
      {enabled && (
        <Field label="Genotype">
          <select
            value={genotype}
            onChange={(e) => setGenotype(e.target.value as Enums<"genotype">)}
            className="rounded border border-gray-300 px-3 py-2"
          >
            <option value="unknown">Not sure</option>
            <option value="AA">AA</option>
            <option value="AS">AS</option>
            <option value="SS">SS</option>
            <option value="AC">AC</option>
            <option value="SC">SC</option>
          </select>
        </Field>
      )}
      <StepButtons onBack={onBack} />
    </form>
  );
}

function PhotosStep({
  supabase,
  onNext,
  onBack,
  initialPhotos,
}: {
  supabase: SB;
  onNext: () => void;
  onBack: () => void;
  initialPhotos: { position: number }[];
}) {
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(initialPhotos.map((p) => [p.position, true])),
  );

  async function handleFile(position: number, file: File) {
    setBusySlot(position);
    setError(null);
    const result = await uploadImage(supabase, file, "photo", { position });
    setBusySlot(null);
    if (result.error) {
      setError(friendlyErrorMessage(result.error));
      return;
    }
    setUploaded((u) => ({ ...u, [position]: true }));
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Photos</h2>
      <p className="text-sm text-gray-500">At least the first photo, showing your face, is required.</p>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6].map((position) => (
          <label
            key={position}
            className="flex aspect-square cursor-pointer items-center justify-center rounded border border-dashed border-gray-300 text-sm text-gray-400"
          >
            {busySlot === position ? "..." : uploaded[position] ? "Uploaded" : `Slot ${position}`}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(position, file);
              }}
            />
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <StepButtons onBack={onBack} onNext={onNext} nextLabel="Continue" disabled={!uploaded[1]} />
    </div>
  );
}

function SelfieStep({
  supabase,
  onNext,
  onBack,
  initial,
}: {
  supabase: SB;
  onNext: () => void;
  onBack: () => void;
  initial: { id: string; pose_code: string; selfie_path: string | null } | null;
}) {
  const [pose, setPose] = useState<{ verificationId: string; poseCode: string } | null>(
    initial ? { verificationId: initial.id, poseCode: initial.pose_code } : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(Boolean(initial?.selfie_path));

  async function start() {
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc("start_verification");
    setBusy(false);
    if (error || !data) {
      setError(friendlyErrorMessage(error?.message ?? "could_not_start"));
      return;
    }
    setPose(data as { verificationId: string; poseCode: string });
  }

  async function handleFile(file: File) {
    if (!pose) return;
    setBusy(true);
    setError(null);
    const result = await uploadImage(supabase, file, "selfie", { verificationId: pose.verificationId });
    setBusy(false);
    if (result.error) {
      setError(friendlyErrorMessage(result.error));
      return;
    }
    setDone(true);
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Quick verification</h2>
      <p className="text-sm text-gray-500">
        A human reviews this before your profile is visible to anyone.
      </p>
      {!pose && (
        <button onClick={start} disabled={busy} className="rounded bg-black px-3 py-2 text-white">
          {busy ? "Starting..." : "Start verification"}
        </button>
      )}
      {pose && !done && (
        <>
          <p className="rounded bg-gray-100 px-3 py-2 text-sm">
            Pose: <strong>{pose.poseCode.replace("_", " ")}</strong>
          </p>
          <label className="flex aspect-square w-40 cursor-pointer items-center justify-center rounded border border-dashed border-gray-300 text-sm text-gray-400">
            {busy ? "Uploading..." : "Take or choose a photo"}
            <input
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
        </>
      )}
      {done && <p className="text-sm text-green-700">Selfie received. Waiting on the rest of onboarding.</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <StepButtons onBack={onBack} onNext={onNext} nextLabel="Continue" disabled={!done} />
    </div>
  );
}

function ReviewStep({
  supabase,
  run,
  onBack,
  onDone,
}: {
  supabase: SB;
  run: RunFn;
  onBack: () => void;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Ready to submit</h2>
      <p className="text-sm text-gray-500">
        A human reviews your selfie before your profile becomes visible to anyone.
      </p>
      <StepButtons
        onBack={onBack}
        onNext={async () => {
          const ok = await run(async () => {
            const { error } = await supabase.rpc("submit_for_review");
            return { error };
          });
          if (ok) onDone();
        }}
        nextLabel="Submit for review"
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function StepButtons({
  onBack,
  onNext,
  nextLabel = "Continue",
  disabled = false,
}: {
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-2 flex justify-between">
      <button type="button" onClick={onBack} className="text-sm text-gray-500 underline">
        Back
      </button>
      <button
        type={onNext ? "button" : "submit"}
        onClick={onNext}
        disabled={disabled}
        className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
      >
        {nextLabel}
      </button>
    </div>
  );
}
