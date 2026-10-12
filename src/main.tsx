import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// The design system is the source of truth for tokens and DOM component styles. Import, never copy.
import '../lethe-design-system/tokens.css';
import '../lethe-design-system/components/bundle.css';
import './styles/app.css';
import { App } from './App';
import { FlowerSandbox } from './scene/sandbox/FlowerSandbox';

// ?sandbox=<name> opens one effect on its own page for tuning (docs/build-plan.md: build each effect in a sandbox first).
const sandbox = new URLSearchParams(location.search).get('sandbox');
const Root = sandbox === 'flowers' ? FlowerSandbox : App;

createRoot(document.getElementById('root')!).render(<StrictMode><Root /></StrictMode>);
