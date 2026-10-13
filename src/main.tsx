import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// The design system is the source of truth for tokens and DOM component styles. Import, never copy.
import '../lethe-design-system/tokens.css';
import '../lethe-design-system/components/bundle.css';
import './styles/app.css';
import { App } from './App';
import { FlowerSandbox } from './scene/sandbox/FlowerSandbox';
import { BloomSandbox } from './scene/sandbox/BloomSandbox';
import { DissolveSandbox } from './scene/sandbox/DissolveSandbox';
import { ThreadSandbox } from './scene/sandbox/ThreadSandbox';

// ?sandbox=<name> opens one effect on its own page for tuning (docs/build-plan.md: build each effect in a sandbox first).
const sandbox = new URLSearchParams(location.search).get('sandbox');
const SANDBOXES: Record<string, () => React.JSX.Element> = { flowers: FlowerSandbox, threads: ThreadSandbox, bloom: BloomSandbox, dissolve: DissolveSandbox };
const Root = (sandbox && SANDBOXES[sandbox]) || App;

createRoot(document.getElementById('root')!).render(<StrictMode><Root /></StrictMode>);
