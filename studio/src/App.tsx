import { StudioProvider } from './studio/StudioContext';
import { StudioShell } from './components/StudioShell';

export default function App(): JSX.Element {
  return (
    <StudioProvider>
      <StudioShell />
    </StudioProvider>
  );
}
