import { test, expect } from '@playwright/test';

/**
 * CYRE Studio — engine workflows.
 *
 * Every flow here drives the real `@cyre/engine` runtime through the GUI and
 * asserts on simulation state that only the engine can produce.
 */

test('scenario library selects and runs a scenario into the viewport', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('menu-scenarios').click();
  await page.getByTestId('menu-item-scenarios.library').click();

  const library = page.getByTestId('window-scenario-library');
  await expect(library).toBeVisible();

  await library.getByTestId('scenario-filter').fill('fintech');
  await library.getByTestId('scenario-select-fintech').click();
  await library.getByTestId('scenario-run-fintech').click();

  const stage = page.getByTestId('cyre-stage');
  await expect(stage).toHaveAttribute('data-cyber-state', 'active');
  await expect(stage).toHaveAttribute('data-host-count', '6');
});

test('simulation window drives transport, speed and the deterministic seed', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('menu-simulation').click();
  await page.getByTestId('menu-item-simulation.control').click();

  const simulation = page.getByTestId('window-simulation');
  await simulation.getByTestId('simulation-seed').fill('4242');
  await simulation.getByRole('button', { name: 'Apply seed' }).click();

  await simulation.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByTestId('studio-statusbar')).toContainText('RUNNING');

  await simulation.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByTestId('studio-statusbar')).toContainText('STOPPED');
});

test('attack chain compromises hosts and the viewport reflects it', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('menu-simulation').click();
  await page.getByTestId('menu-item-simulation.play').click();

  await page.getByTestId('menu-simulation').click();
  await page.getByTestId('menu-item-simulation.attack').click();

  const attack = page.getByTestId('window-attack');
  await attack.getByTestId('attack-escalatePrivileges').click();
  await attack.getByTestId('attack-moveToDatabase').click();
  await attack.getByTestId('attack-accessTarget').click();

  await expect(page.getByTestId('cyre-stage')).toHaveAttribute('data-attacker-position', 'database-server');

  await page.getByTestId('menu-simulation').click();
  await page.getByTestId('menu-item-simulation.hosts').click();

  const hosts = page.getByTestId('window-hosts');
  await expect(hosts.getByTestId('host-row-database-server')).toContainText('compromised');
});

test('detection raises alerts and defender actions contain the incident', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('menu-simulation').click();
  await page.getByTestId('menu-item-simulation.play').click();
  await page.getByTestId('menu-simulation').click();
  await page.getByTestId('menu-item-simulation.detection').click();

  const detection = page.getByTestId('window-detection');
  await detection.getByTestId('detection-run').click();

  await expect(detection.getByTestId(/^alert-investigate-/).first()).toBeVisible();
  await detection.getByTestId(/^alert-investigate-/).first().click();
  await expect(detection).toContainText('investigating');

  await detection.getByTestId('isolate-web-server').click();
  await expect(detection.getByTestId('restore-web-server')).toBeEnabled();
});

test('replay window records and steps a deterministic replay', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('menu-simulation').click();
  await page.getByTestId('menu-item-simulation.play').click();

  await page.getByTestId('menu-replay').click();
  await page.getByTestId('menu-item-replay.record').click();

  const replay = page.getByTestId('window-replay');
  await expect(replay).toBeVisible();

  await replay.getByTestId('replay-forward').click();
  await replay.getByTestId('replay-forward').click();
  await expect(replay).toContainText('2/');

  await replay.getByRole('button', { name: 'End' }).click();
  await replay.getByTestId('replay-play').click();
  await expect(replay).toContainText('Pause');
});

test('research window runs a multi-seed experiment and compares runs', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('menu-research').click();
  await page.getByTestId('menu-item-research.experiments').click();

  const research = page.getByTestId('window-research');
  await research.getByTestId('experiment-count').fill('4');
  await research.getByTestId('experiment-run').click();

  await expect(research.getByTestId('experiment-run-1')).toBeVisible();
  await expect(research.getByTestId('experiment-run-4')).toBeVisible();
  await expect(research).toContainText('identical final state');
});

test('telemetry records engine actions and exports', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('menu-simulation').click();
  await page.getByTestId('menu-item-simulation.play').click();

  await page.getByTestId('menu-simulation').click();
  await page.getByTestId('menu-item-simulation.action.detectThreats').click();

  await page.getByTestId('menu-research').click();
  await page.getByTestId('menu-item-research.telemetry').click();

  const telemetry = page.getByTestId('window-telemetry');
  await expect(telemetry.getByTestId(/^telemetry-row-/).first()).toBeVisible();
  await expect(telemetry.getByTestId('telemetry-export')).toBeEnabled();
});

test('performance window runs the engine benchmarks', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('menu-research').click();
  await page.getByTestId('menu-item-research.performance').click();

  const performance = page.getByTestId('window-performance');
  await performance.getByTestId('benchmark-run').click();
  await performance.getByTestId('benchmark-large').click();

  await expect(performance.getByTestId(/^benchmark-row-/)).toHaveCount(2);
});

test('security window validates the sandbox and rejects hostile payloads', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('menu-tools').click();
  await page.getByTestId('menu-item-tools.security').click();

  const security = page.getByTestId('window-security');
  await security.getByTestId('security-run').click();

  await expect(security).toContainText(/passed/i);
  await expect(security.getByTestId('security-check-Prototype pollution key')).toContainText('rejected');
  await expect(security.getByTestId('security-check-Malformed JSON')).toContainText('rejected');
});

test('scenario editor authors, validates and saves a custom scenario', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('menu-scenarios').click();
  await page.getByTestId('menu-item-scenarios.editor').click();

  const editor = page.getByTestId('window-scenario-editor');
  await editor.getByRole('button', { name: 'New draft' }).click();

  await editor.getByTestId('scenario-name').fill('Authored Scenario');
  await editor.getByTestId('scenario-new-node-id').fill('honeypot');
  await editor.getByTestId('scenario-new-node-name').fill('Honeypot');
  await editor.getByTestId('scenario-node-add').click();

  await expect(editor.getByTestId('scenario-node-honeypot')).toBeVisible();

  await editor.getByTestId('scenario-validate').click();
  await expect(editor).toContainText(/valid/i);
});

test('visualization window switches render mode and toggles overlays', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('menu-view').click();
  await page.getByTestId('menu-item-view.visualization').click();

  const visualization = page.getByTestId('window-visualization');
  await visualization.getByTestId('visualization-mode').getByText('2.5D').click();

  await expect(page.getByTestId('cyre-stage')).toHaveAttribute('data-render-mode', '2.5d');
  await expect(page.getByTestId('stage-mode')).toContainText('2.5D');

  await visualization.getByTestId('overlay-labels').click();
  await visualization.getByTestId('overlay-compromised').click();
});

test('project window creates and saves a project', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('menu-file').click();
  await page.getByTestId('menu-item-project.manager').click();

  const project = page.getByTestId('window-project');
  await project.getByTestId('project-name').fill('E2E Drill');
  await project.getByTestId('project-create').click();

  await expect(page.getByTestId('studio-menubar')).toContainText('E2E Drill');

  await project.getByTestId('project-save').click();
  await expect(page.getByTestId('toast-success').first()).toBeVisible();
});

test('output window surfaces engine notifications', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('menu-simulation').click();
  await page.getByTestId('menu-item-simulation.play').click();

  await page.getByTestId('menu-view').click();
  await page.getByTestId('menu-item-menu.view.output').click();

  const output = page.getByTestId('window-output');
  await expect(output.getByTestId(/^output-/).first()).toBeVisible();
});
