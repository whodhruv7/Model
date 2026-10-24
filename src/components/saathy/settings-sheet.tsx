'use client';

// Settings sheet — three tabs:
//  Chat    : tone / style / length / language / Socratic / animations / sounds
//            (every control truly changes the engine — all are injected into
//             the system prompt or UI behaviour, and persist server-side)
//  Student : identity + current class context + focus subject/chapter
//  Founder : PIN-gated (default 2405) model & provider configuration with a
//            REAL connection test, knowledge-source status (honest), and
//            history controls.
import { useEffect, useState } from 'react';
import { Cloud, KeyRound, Loader2, Lock, PlugZap, ShieldCheck, Trash2, Database, RefreshCcw } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mascot } from './mascot';
import type { ContextResponse, ProfileCtx, SubjectCtx } from '@/lib/saathy-types';

export interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialTab: 'chat' | 'student' | 'founder';
  ctx: ContextResponse | null;
  founderUnlocked: boolean;
  onPatchProfile: (patch: Partial<ProfileCtx>) => void;
  onConceptFocus: (conceptId: string | null) => void;
  onClearAllChats: () => void;
}

// ---------- small building blocks ----------

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#ece7e0] bg-white px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-extrabold text-[#1e3a8a]">{label}</p>
        {hint ? <p className="mt-0.5 text-[11px] font-semibold leading-snug text-[#8a94a8]">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SegGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg border border-[#dfe4ee] bg-[#f6f8fc] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1.5 text-[11.5px] font-extrabold transition-all ${
            value === o.value ? 'bg-white text-[#0e2a5e] shadow-sm ring-1 ring-[#7fb3ff]/50' : 'text-[#7c8aa5] hover:text-[#1e3a8a]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Founder panel ----------

interface FounderConfig {
  provider: string;
  builtinModelId: string;
  customBaseUrl: string;
  customApiKeyMasked: string;
  customApiKeySet: boolean;
  customModelId: string;
  verifiedAt: string | null;
}

function FounderPanel({
  ctx,
  unlocked,
  onClearAllChats,
}: {
  ctx: ContextResponse | null;
  unlocked: boolean;
  onClearAllChats: () => void;
}) {
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [config, setConfig] = useState<FounderConfig | null>(null);
  const [newPin, setNewPin] = useState('');
  const [pinMsg, setPinMsg] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelId, setModelId] = useState('');
  const [builtinModel, setBuiltinModel] = useState('glm-4-plus');
  const [provider, setProvider] = useState<'builtin' | 'custom'>('builtin');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const unlock = async () => {
    setPinError(null);
    const res = await fetch('/api/founder/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      setPinError('Incorrect PIN. Try again.');
      setPin('');
      return;
    }
    const j = await res.json();
    applyConfig(j.config);
    sessionStorage.setItem('saathy_founder_pin', pin);
  };

  const applyConfig = (c: FounderConfig) => {
    setConfig(c);
    setProvider(c.provider === 'custom' ? 'custom' : 'builtin');
    setBaseUrl(c.customBaseUrl ?? '');
    setModelId(c.customModelId ?? '');
    setBuiltinModel(c.builtinModelId || 'glm-4-plus');
  };

  useEffect(() => {
    const savedPin = sessionStorage.getItem('saathy_founder_pin');
    if (savedPin && !config) {
      setPin(savedPin);
      fetch('/api/founder/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: savedPin }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j?.config) applyConfig(j.config);
          else sessionStorage.removeItem('saathy_founder_pin');
        })
        .catch(() => sessionStorage.removeItem('saathy_founder_pin'));
    }
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/founder/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin,
          provider,
          builtinModelId: builtinModel,
          customBaseUrl: baseUrl,
          customModelId: modelId,
          ...(keyInput.trim() ? { customApiKey: keyInput.trim() } : {}),
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setSaveMsg(j.error ?? 'Could not save configuration');
        return;
      }
      applyConfig(j.config);
      setKeyInput('');
      setSaveMsg('Saved. Verifying connection…');

      // Real verification: a genuine request right after saving
      const testRes = await fetch('/api/founder/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, target: provider === 'custom' ? 'custom' : 'builtin' }),
      });
      const tj = await testRes.json();
      if (tj.ok) {
        setTestResult({ ok: true, msg: `Connected in ${tj.latencyMs}ms · ${tj.model ?? tj.reply ?? ''}` });
        setSaveMsg('Saved & verified. Saathy is running on this configuration.');
        // re-fetch config to show verifiedAt
        const cfgRes = await fetch('/api/founder/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin }),
        });
        if (cfgRes.ok) {
          const cj = await cfgRes.json();
          if (cj.config) applyConfig(cj.config);
        }
      } else {
        setTestResult({ ok: false, msg: tj.error ?? 'Connection failed' });
        setSaveMsg('Saved, but the connection test failed — see the result below.');
      }
    } finally {
      setSaving(false);
    }
  };

  const testOnly = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/founder/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          provider === 'custom'
            ? { pin, target: 'custom', customBaseUrl: baseUrl, customApiKey: keyInput.trim() || undefined, customModelId: modelId }
            : { pin, target: 'builtin' }
        ),
      });
      const j = await res.json();
      setTestResult(j.ok ? { ok: true, msg: `Connected in ${j.latencyMs}ms · ${j.model ?? j.reply ?? ''}` } : { ok: false, msg: j.error ?? 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  const changePin = async () => {
    setPinMsg(null);
    if (!/^\d{4}$/.test(newPin)) {
      setPinMsg('PIN must be exactly 4 digits.');
      return;
    }
    const res = await fetch('/api/founder/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, newPin }),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) {
      setPinMsg(j.error ?? 'Could not change PIN');
      return;
    }
    setPinMsg('PIN changed. New PIN is active now.');
    setNewPin('');
    sessionStorage.setItem('saathy_founder_pin', newPin);
    setPin(newPin);
  };

  const deleteKey = async () => {
    const res = await fetch(`/api/founder/config?pin=${encodeURIComponent(pin)}`, { method: 'DELETE' });
    const j = await res.json();
    if (j.ok) {
      applyConfig(j.config);
      setKeyInput('');
      setSaveMsg('Stored API key deleted.');
    }
  };

  if (!unlocked && !config) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-[#ffe0c7] bg-[#fff3ea] p-4 text-center">
          <Mascot pose="thinking" size={64} className="mx-auto" />
          <p className="mt-1 flex items-center justify-center gap-1.5 text-[13.5px] font-extrabold text-[#7a3b1d]">
            <Lock className="h-3.5 w-3.5" /> Founder access
          </p>
          <p className="mx-auto mt-1 max-w-[36ch] text-[11.5px] font-semibold leading-relaxed text-[#a05c2e]">
            Model, API keys aur knowledge-source settings yahan hain. Enter the founder PIN to continue.
          </p>
        </div>
        <div className={`space-y-2 ${pinError ? 'shake' : ''}`}>
          <Label htmlFor="founder-pin" className="text-[11px] font-extrabold uppercase tracking-wider text-[#8a94a8]">
            Founder PIN
          </Label>
          <Input
            id="founder-pin"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && pin.length === 4 && unlock()}
            placeholder="••••"
            className="h-11 text-center text-[20px] font-extrabold tracking-[0.5em]"
          />
          {pinError ? <p className="text-center text-[12px] font-bold text-[#e5484d]">{pinError}</p> : null}
          <Button onClick={unlock} disabled={pin.length !== 4} className="h-10 w-full bg-[#1e3a8a] font-extrabold hover:bg-[#16305b]">
            Unlock
          </Button>
          <p className="text-center text-[10.5px] font-semibold leading-relaxed text-[#b3bdcf]">
            Prototype note: this PIN is a convenience gate, not production security. In the VidhyaSaathy app this area sits behind server-side admin roles.
          </p>
        </div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-3">
      {/* Provider */}
      <div className="rounded-xl border border-[#ece7e0] bg-white p-3.5">
        <p className="mb-2 flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wider text-[#8a94a8]">
          <Cloud className="h-3.5 w-3.5" /> Model provider
        </p>
        <SegGroup
          value={provider}
          onChange={(v) => setProvider(v)}
          options={[
            { value: 'builtin', label: 'Built-in Z.ai GLM' },
            { value: 'custom', label: 'Custom (OpenAI-compatible)' },
          ]}
        />

        {provider === 'builtin' ? (
          <div className="mt-3 space-y-2">
            <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#8a94a8]">Model ID</Label>
            <Input value={builtinModel} onChange={(e) => setBuiltinModel(e.target.value)} className="h-9 text-[13px] font-bold" />
            <p className="text-[11px] font-semibold text-[#8a94a8]">
              Runs on the platform&apos;s managed model. Saathy&apos;s identity, mascot, theme, student data and history stay exactly the same no matter which provider is active.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-2.5">
            <div>
              <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#8a94a8]">Base URL</Label>
              <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" className="h-9 text-[13px] font-bold" />
            </div>
            <div>
              <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#8a94a8]">API key</Label>
              {config.customApiKeySet ? (
                <div className="flex items-center gap-2">
                  <Input readOnly value={config.customApiKeyMasked || 'Stored'} className="h-9 text-[13px] font-bold" />
                  <Button type="button" variant="outline" size="sm" onClick={deleteKey} className="h-9 shrink-0 gap-1 border-[#f3c1c2] text-[12px] font-bold text-[#9c2c30]">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              ) : null}
              <Input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={config.customApiKeySet ? 'Type a new key to replace the stored one' : 'sk-…'}
                className="mt-1.5 h-9 text-[13px] font-bold"
              />
              <p className="mt-1 text-[10.5px] font-semibold text-[#8a94a8]">
                Stored server-side, shown masked, never logged. Do not paste keys into code you share publicly.
              </p>
            </div>
            <div>
              <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#8a94a8]">Model ID</Label>
              <Input value={modelId} onChange={(e) => setModelId(e.target.value)} placeholder="gpt-4o-mini / llama-3-70b…" className="h-9 text-[13px] font-bold" />
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={testOnly} disabled={testing} className="h-8 gap-1.5 text-[12px] font-extrabold">
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlugZap className="h-3.5 w-3.5" />}
            Test connection
          </Button>
          <Button type="button" size="sm" onClick={saveConfig} disabled={saving} className="h-8 gap-1.5 bg-[#1e3a8a] text-[12px] font-extrabold hover:bg-[#16305b]">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Save configuration
          </Button>
          {config.verifiedAt ? (
            <span className="rounded-full bg-[#edf7ee] px-2.5 py-1 text-[11px] font-extrabold text-[#227031]">Verified ✓</span>
          ) : (
            <span className="rounded-full bg-[#fff3ea] px-2.5 py-1 text-[11px] font-extrabold text-[#a05c2e]">Not verified yet</span>
          )}
        </div>
        {testResult ? (
          <p className={`msg-in mt-2 rounded-lg px-3 py-2 text-[12px] font-bold ${testResult.ok ? 'bg-[#edf7ee] text-[#227031]' : 'bg-[#fdf0f0] text-[#9c2c30]'}`}>
            {testResult.ok ? '✓ ' : '✕ '}
            {testResult.msg}
          </p>
        ) : null}
        {saveMsg ? <p className="mt-1.5 text-[11.5px] font-bold text-[#5c6f8a]">{saveMsg}</p> : null}
      </div>

      {/* Knowledge sources — honest status */}
      <div className="rounded-xl border border-[#ece7e0] bg-white p-3.5">
        <p className="mb-2 flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wider text-[#8a94a8]">
          <Database className="h-3.5 w-3.5" /> Knowledge sources
        </p>
        <div className="space-y-1.5 text-[12.5px] font-semibold">
          <p className="flex items-center justify-between rounded-lg bg-[#f3f9ff] px-3 py-2">
            <span className="text-[#1e3a8a]">Teacher&apos;s notes (concept-tagged)</span>
            <span className="text-[11px] font-extrabold text-[#227031]">Connected · demo library</span>
          </p>
          <p className="flex items-center justify-between rounded-lg bg-[#fdf0f0]/60 px-3 py-2">
            <span className="text-[#7c4042]">Full school library (RAG over all uploads)</span>
            <span className="text-[11px] font-extrabold text-[#9c2c30]">Not connected — planned</span>
          </p>
        </div>
        <p className="mt-2 text-[10.5px] font-semibold leading-relaxed text-[#8a94a8]">
          Saathy currently grounds answers in the seeded teacher notes for Motion and Coordinate Geometry. Honesty layer rules are active: answers cite their source and flag anything beyond school material. The RAG boundary is reserved in the engine — swapping it in later touches only the context module.
        </p>
      </div>

      {/* PIN + danger zone */}
      <div className="rounded-xl border border-[#ece7e0] bg-white p-3.5">
        <p className="mb-2 flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wider text-[#8a94a8]">
          <KeyRound className="h-3.5 w-3.5" /> Founder PIN
        </p>
        <div className="flex gap-2">
          <Input
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            maxLength={4}
            placeholder="New 4-digit PIN"
            inputMode="numeric"
            className="h-9 text-[13px] font-bold"
          />
          <Button type="button" variant="outline" size="sm" onClick={changePin} className="h-9 shrink-0 gap-1 text-[12px] font-extrabold">
            <RefreshCcw className="h-3.5 w-3.5" /> Change
          </Button>
        </div>
        {pinMsg ? <p className="mt-1.5 text-[11.5px] font-bold text-[#5c6f8a]">{pinMsg}</p> : null}
      </div>

      <div className="rounded-xl border border-[#f3c1c2] bg-[#fdf0f0]/50 p-3.5">
        <p className="mb-2 text-[12px] font-extrabold uppercase tracking-wider text-[#9c2c30]">Danger zone</p>
        <Button type="button" variant="outline" size="sm" onClick={onClearAllChats} className="h-9 gap-1.5 border-[#f3c1c2] bg-white text-[12px] font-extrabold text-[#9c2c30] hover:bg-[#fdf0f0]">
          <Trash2 className="h-3.5 w-3.5" /> Delete all chat history
        </Button>
      </div>
    </div>
  );
}

// ---------- Main sheet ----------

export function SettingsSheet({
  open,
  onOpenChange,
  initialTab,
  ctx,
  founderUnlocked,
  onPatchProfile,
  onConceptFocus,
  onClearAllChats,
}: SettingsSheetProps) {
  const [tab, setTab] = useState<'chat' | 'student' | 'founder'>(initialTab);
  const [subjectId, setSubjectId] = useState<string>('');
  const [chapterId, setChapterId] = useState<string>('');

  // React-recommended render-phase adjustment: re-sync local form state when
  // the sheet opens or the server context changes (no cascading effect renders).
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevCtx, setPrevCtx] = useState<ContextResponse | null>(ctx);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setTab(initialTab);
  }
  if (ctx !== prevCtx) {
    setPrevCtx(ctx);
    setSubjectId(ctx?.profile.focusSubjectId ?? ctx?.subjects[0]?.id ?? '');
    setChapterId(ctx?.profile.focusChapterId ?? ctx?.subjects[0]?.chapters[0]?.id ?? '');
  }

  const profile = ctx?.profile;
  const subjects: SubjectCtx[] = ctx?.subjects ?? [];
  const subject = subjects.find((s) => s.id === subjectId);
  const chapter = subject?.chapters.find((c) => c.id === chapterId);

  if (!profile) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-[#ece7e0] bg-[#fdf9f4] p-0 sm:max-w-md">
        <SheetHeader className="border-b border-[#ece7e0] px-5 pb-3 pt-5">
          <SheetTitle className="flex items-center gap-2 text-[16px] font-extrabold text-[#16305b]">
            <Mascot pose="wink" size={30} /> Settings
          </SheetTitle>
          <SheetDescription className="text-[12px] font-semibold text-[#8a94a8]">
            Every control here actually changes Saathy — instantly, and it stays saved.
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 py-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'chat' | 'student' | 'founder')}>
            <TabsList className="mb-4 grid h-9 w-full grid-cols-3 bg-[#f1ece4]">
              <TabsTrigger value="chat" className="text-[12px] font-extrabold data-[state=active]:text-[#0e2a5e]">Chat</TabsTrigger>
              <TabsTrigger value="student" className="text-[12px] font-extrabold data-[state=active]:text-[#0e2a5e]">Student</TabsTrigger>
              <TabsTrigger value="founder" className="flex items-center gap-1 text-[12px] font-extrabold data-[state=active]:text-[#0e2a5e]">
                Founder
                {!founderUnlocked ? <Lock className="h-3 w-3" /> : null}
              </TabsTrigger>
            </TabsList>

            {/* ---- Chat ---- */}
            <TabsContent value="chat" className="space-y-2.5">
              <Row label="Tone" hint="How Saathy talks to you">
                <SegGroup
                  value={profile.tone}
                  onChange={(v) => onPatchProfile({ tone: v })}
                  options={[
                    { value: 'friendly', label: 'Friendly' },
                    { value: 'balanced', label: 'Balanced' },
                    { value: 'formal', label: 'Formal' },
                  ]}
                />
              </Row>
              <Row label="Explanation style" hint="How ideas are broken down">
                <SegGroup
                  value={profile.style}
                  onChange={(v) => onPatchProfile({ style: v })}
                  options={[
                    { value: 'simple', label: 'Simple' },
                    { value: 'steps', label: 'Steps' },
                    { value: 'detailed', label: 'Detailed' },
                  ]}
                />
              </Row>
              <Row label="Answer length" hint="How much detail per reply">
                <SegGroup
                  value={profile.length}
                  onChange={(v) => onPatchProfile({ length: v })}
                  options={[
                    { value: 'concise', label: 'Concise' },
                    { value: 'balanced', label: 'Balanced' },
                    { value: 'thorough', label: 'Thorough' },
                  ]}
                />
              </Row>
              <Row label="Explanation language" hint="Exam terms always stay in English">
                <SegGroup
                  value={profile.language}
                  onChange={(v) => onPatchProfile({ language: v })}
                  options={[
                    { value: 'english', label: 'English' },
                    { value: 'hinglish', label: 'Hinglish' },
                    { value: 'hindi', label: 'हिंदी' },
                  ]}
                />
              </Row>
              <Row label="Socratic mode" hint="Guide me with questions first instead of full answers">
                <Switch checked={profile.socratic} onCheckedChange={(v) => onPatchProfile({ socratic: v })} />
              </Row>
              <Row label="Animations" hint="Mascot & interface motion (reduced-motion is always respected)">
                <Switch checked={profile.animations} onCheckedChange={(v) => onPatchProfile({ animations: v })} />
              </Row>
              <Row label="Sounds" hint="Tiny chime on correct answers">
                <Switch checked={profile.sounds} onCheckedChange={(v) => onPatchProfile({ sounds: v })} />
              </Row>
            </TabsContent>

            {/* ---- Student ---- */}
            <TabsContent value="student" className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="col-span-2">
                  <Label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-[#8a94a8]">Name</Label>
                  <Input
                    defaultValue={profile.name}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== profile.name && onPatchProfile({ name: e.target.value.trim() })}
                    className="h-9 text-[13px] font-bold"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-[#8a94a8]">Class</Label>
                  <Input
                    defaultValue={profile.className}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== profile.className && onPatchProfile({ className: e.target.value.trim() })}
                    className="h-9 text-[13px] font-bold"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-[#8a94a8]">Section</Label>
                  <Input
                    defaultValue={profile.section}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== profile.section && onPatchProfile({ section: e.target.value.trim() })}
                    className="h-9 text-[13px] font-bold"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-[#8a94a8]">Board</Label>
                  <Select value={profile.board} onValueChange={(v) => onPatchProfile({ board: v })}>
                    <SelectTrigger className="h-9 text-[13px] font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['CBSE', 'ICSE', 'State Board'].map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-[#8a94a8]">School</Label>
                  <Input
                    defaultValue={profile.schoolName}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== profile.schoolName && onPatchProfile({ schoolName: e.target.value.trim() })}
                    className="h-9 text-[13px] font-bold"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[#ece7e0] bg-white p-3.5">
                <p className="mb-2 text-[12px] font-extrabold uppercase tracking-wider text-[#8a94a8]">Current learning context</p>
                <div className="space-y-2">
                  <Select
                    value={subjectId}
                    onValueChange={(v) => {
                      setSubjectId(v);
                      const ch = subjects.find((s) => s.id === v)?.chapters[0];
                      setChapterId(ch?.id ?? '');
                      onPatchProfile({ focusSubjectId: v, focusChapterId: ch?.id ?? null, focusConceptId: null });
                      onConceptFocus(null);
                    }}
                  >
                    <SelectTrigger className="h-9 text-[13px] font-bold"><SelectValue placeholder="Subject" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {subject ? (
                    <Select
                      value={chapterId}
                      onValueChange={(v) => {
                        setChapterId(v);
                        onPatchProfile({ focusChapterId: v, focusConceptId: null });
                        onConceptFocus(null);
                      }}
                    >
                      <SelectTrigger className="h-9 text-[13px] font-bold"><SelectValue placeholder="Chapter" /></SelectTrigger>
                      <SelectContent>
                        {subject.chapters.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            Ch {c.number} · {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  {chapter ? (
                    <div>
                      <p className="mb-1 mt-2 text-[10px] font-extrabold uppercase tracking-wider text-[#8a94a8]">Concepts in this chapter</p>
                      <div className="space-y-1">
                        {chapter.concepts.map((c) => {
                          const dot = c.tier !== null ? ['#e5484d', '#f19937', '#7fb3ff', '#46a758'][c.tier] : '#d7dbe4';
                          const active = profile.focusConceptId === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                onPatchProfile({ focusConceptId: active ? null : c.id });
                                onConceptFocus(active ? null : c.id);
                              }}
                              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-bold transition-colors ${
                                active ? 'bg-[#e6f0ff] ring-1 ring-[#7fb3ff]' : 'bg-[#f6f8fc] hover:bg-[#eef4fd]'
                              }`}
                            >
                              <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot }} />
                              <span className="flex-1 text-[#1e3a8a]">{c.name}</span>
                              <span className="text-[10px] font-extrabold text-[#8a94a8]">{c.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </TabsContent>

            {/* ---- Founder ---- */}
            <TabsContent value="founder">
              <FounderPanel ctx={ctx} unlocked={founderUnlocked} onClearAllChats={onClearAllChats} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
