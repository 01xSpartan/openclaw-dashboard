import { render } from 'preact';
import { App } from './app';
import { applyTheme } from './theme';
import './styles/global.css';

// Apply theme immediately
applyTheme();

render(<App />, document.getElementById('app')!);
