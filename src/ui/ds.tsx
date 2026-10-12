// Typed ports of the design-system DOM components (lethe-design-system/components/bundle.js).
// Styling comes from the design system's bundle.css; markup and class names must stay identical.
// Bloom and Thread are NOT here: in Lethe they are 3D (src/scene).

import { useState, type FormEvent, type ReactNode } from 'react';
import { rng, stateOf, type Kind, type MemoryState } from '../engine';

const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');

const KIND_HUE: Record<Kind, string> = { sentence: 'var(--sentence)', song: 'var(--song)', place: 'var(--place)', photo: 'var(--light)' };

/* ---------- Button ---------- */
export function Button({ variant, className, children, ...rest }:
  { variant?: 'pill' } & React.ComponentProps<'button'>) {
  return (
    <button type="button" {...rest} className={cx('lt-btn', 'interface', variant === 'pill' ? 'is-pill' : 'is-text', className)}>
      {children}
    </button>
  );
}

/* ---------- LightCounter ---------- */
export function LightCounter({ value, max = 5, showLabel, className, style }:
  { value: number; max?: number; showLabel?: boolean; className?: string; style?: React.CSSProperties }) {
  const val = Math.max(0, Math.min(max, value));
  return (
    <div className={cx('lt-light', className)} role="img" aria-label={`${val} of ${max} light`} style={style}>
      <span className="lt-light-dots" aria-hidden>
        {Array.from({ length: max }, (_, i) => <span key={i} className={cx('lt-light-dot', i < val && 'is-lit')} />)}
      </span>
      {showLabel && <span className="interface-sm lt-light-label" aria-hidden>{val} of {max} light</span>}
    </div>
  );
}

/* ---------- Recollection ---------- */
function memoryText(text: string, state: MemoryState, seed: string): ReactNode[] {
  const r = rng(`words:${seed || text}`);
  const drop = state === 'ghost' ? 0.4 : state === 'lost' ? 0.85 : 0;
  const parts = String(text).split(/(“[^”]*”|"[^"]*")/);
  let n = 0;
  return parts.map((part, pi) => {
    if (!part) return null;
    const speech = /^[“"]/.test(part);
    const words = part.split(/(\s+)/).map((wd, wi) => {
      if (!wd || /^\s+$/.test(wd)) return wd;
      const first = n++ === 0;
      if (drop && !first && r() < drop) return <span key={wi} className="lt-gap" style={{ width: `${Math.max(2, wd.length * 0.45)}em` }} />;
      return wd;
    });
    return speech ? <em key={pi} className="lt-speech">{words}</em> : <span key={pi}>{words}</span>;
  });
}

export function Recollection(props: {
  text: string; seed: string; kind?: Kind; planted?: string; vitality?: number; state?: MemoryState;
  heldBy?: string[]; actions?: ReactNode; size?: 'lg'; children?: ReactNode; className?: string; style?: React.CSSProperties;
}) {
  const state = props.state ?? stateOf(props.vitality ?? 1);
  const bits = [props.kind, props.planted ? `planted ${props.planted}` : null, state].filter(Boolean);
  const lg = props.size === 'lg';
  return (
    <figure className={cx('lt-recollection', lg && 'is-lg', `is-${state}`, props.className)} style={props.style}>
      {props.children && <div className="lt-recollection-media">{props.children}</div>}
      <blockquote className={lg ? 'memory-lg' : 'memory'}
        aria-label={state === 'ghost' || state === 'lost' ? 'a memory with words missing' : undefined}>
        {memoryText(props.text, state, props.seed)}
      </blockquote>
      <figcaption className="interface-sm">{bits.join(' · ')}</figcaption>
      {props.heldBy && props.heldBy.length > 0 && <div className="interface-sm">held by {props.heldBy.join(' · ')}</div>}
      {props.actions && <div className="lt-recollection-actions">{props.actions}</div>}
    </figure>
  );
}

/* ---------- Overlay ---------- */
export function Overlay({ title, actions, width, children, className, style, ...rest }: {
  title?: string; actions?: ReactNode; width?: number | string; children?: ReactNode; className?: string; style?: React.CSSProperties;
} & Omit<React.HTMLAttributes<HTMLElement>, 'title'>) {
  return (
    <section role="dialog" aria-label={title} {...rest} className={cx('lt-overlay', className)} style={{ width, ...style }}>
      {title && <h2 className="title lt-overlay-title">{title}</h2>}
      <div className="lt-overlay-body">{children}</div>
      {actions && <div className="lt-overlay-actions">{actions}</div>}
    </section>
  );
}

/* ---------- PlantField ---------- */
const KINDS: Kind[] = ['sentence', 'photo', 'song', 'place'];
const PLACEHOLDER: Record<Kind, string> = {
  sentence: 'a sentence you want to keep', photo: 'what is in the photograph',
  song: 'a song, and where you heard it', place: 'a place, and who was there',
};

export function PlantField(props: {
  onPlant?: (m: { kind: Kind; text: string }) => void; onKindChange?: (k: Kind) => void; onTextChange?: (t: string) => void;
  kind?: Kind; defaultKind?: Kind; placeholder?: string; disabled?: boolean; className?: string; style?: React.CSSProperties;
}) {
  const [kindS, setKindS] = useState<Kind>(props.defaultKind ?? 'sentence');
  const [val, setVal] = useState('');
  const kind = props.kind ?? kindS;
  const pick = (k: Kind) => { setKindS(k); props.onKindChange?.(k); };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!val.trim() || props.disabled) return;
    props.onPlant?.({ kind, text: val.trim() });
    setVal(''); props.onTextChange?.('');
  };
  return (
    <form className={cx('lt-plant', props.className)} onSubmit={submit}
      style={{ ['--lt-hue' as string]: KIND_HUE[kind], ...props.style }}>
      <div className="lt-plant-kinds" role="radiogroup" aria-label="kind of memory">
        {KINDS.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={k === kind}
            className={cx('lt-kind', 'interface-sm', k === kind && 'is-on')}
            style={{ ['--lt-hue' as string]: KIND_HUE[k] }} onClick={() => pick(k)}>{k}</button>
        ))}
      </div>
      <div className="lt-plant-row">
        <span className="lt-plant-seed" aria-hidden />
        <input className="memory lt-plant-input" value={val} maxLength={280} aria-label="the memory"
          placeholder={props.placeholder ?? PLACEHOLDER[kind]}
          onChange={(e) => { setVal(e.target.value); props.onTextChange?.(e.target.value); }} />
        <Button type="submit" variant="pill" disabled={!val.trim() || props.disabled}>plant</Button>
      </div>
    </form>
  );
}

/* ---------- Whisper ---------- */
export function Whisper({ visible = true, children, className, style }:
  { visible?: boolean; children?: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <p className={cx('lt-whisper', 'interface', !visible && 'is-gone', className)} role="status" style={style}>{children}</p>;
}
