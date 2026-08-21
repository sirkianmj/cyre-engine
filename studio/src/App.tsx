import { StudioProvider } from './studio/StudioContext';
import { StudioShell } from './components/StudioShell';

export default function App() {
  return (
    <StudioProvider>
      <StudioShell />
    </StudioProvider>
  );
}
