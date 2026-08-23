import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useStudio } from '../studio/StudioContext';

interface ViewportSettings {
  showGrid: boolean;
  showWireframe: boolean;
  lightIntensity: number;
}

const TYPE_META: Record<string, { color: string; geometry: 'box' | 'sphere' | 'cylinder' }> = {
  host: { color: '#4f8cff', geometry: 'box' },
  server: { color: '#19c9a7', geometry: 'box' },
  client: { color: '#f39c12', geometry: 'box' },
  router: { color: '#2ecc71', geometry: 'sphere' },
  firewall: { color: '#e74c3c', geometry: 'cylinder' },
  database: { color: '#f5a623', geometry: 'cylinder' },
  service: { color: '#8a5cff', geometry: 'sphere' },
  network: { color: '#00bcd4', geometry: 'sphere' },
  other: { color: '#9b59b6', geometry: 'box' },
};

export function WebGLViewport({ settings }: { settings: ViewportSettings }): JSX.Element {
  const { state, selectNetworkNode } = useStudio();
  const renderMode = state.renderMode ?? '3d';
  const webglRef = useRef<HTMLDivElement | null>(null);
  const canvas2dRef = useRef<HTMLCanvasElement | null>(null);
  const nodes = state.networkNodes;
  const edges = state.networkEdges;

  const nodeObjects = useMemo(() => {
    const map = new Map<string, THREE.Object3D>();
    const group = new THREE.Group();

    nodes.forEach((node, index) => {
      const meta = TYPE_META[node.type] ?? TYPE_META.other;
      const color = new THREE.Color(meta.color);
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.25 });
      let geometry: THREE.BufferGeometry;
      if (meta.geometry === 'sphere') geometry = new THREE.SphereGeometry(0.8, 24, 18);
      else if (meta.geometry === 'cylinder') geometry = new THREE.CylinderGeometry(0.65, 0.65, 1.8, 24);
      else geometry = new THREE.BoxGeometry(1.3, 1.0, 1.3);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        node.position?.x ? (node.position.x - 400) / 120 : (index % 5) * 2.4 - 4.8,
        0.5,
        node.position?.y ? (node.position.y - 300) / 120 : Math.floor(index / 5) * 2.4 - 2.4,
      );
      mesh.userData = { nodeId: node.id };
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (settings.showWireframe) {
        const wireframe = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45 }));
        mesh.add(wireframe);
      }

      group.add(mesh);
      map.set(node.id, mesh);
    });

    edges.forEach((edge) => {
      const source = map.get(edge.source);
      const target = map.get(edge.target);
      if (!source || !target) return;

      const start = source.position.clone();
      const end = target.position.clone();
      const distance = start.distanceTo(end);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const direction = end.clone().sub(start).normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

      const lineGeometry = new THREE.CylinderGeometry(0.03, 0.03, distance, 6);
      const lineMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color('#55aaff'), transparent: true, opacity: 0.35 });
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.position.copy(mid);
      line.quaternion.copy(quaternion);
      group.add(line);
    });

    return group;
  }, [nodes, edges, settings.showWireframe]);

  useEffect(() => {
    if (renderMode !== '3d') return;
    const container = webglRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#080c14');
    scene.fog = new THREE.FogExp2(new THREE.Color('#080c14'), 0.018);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
    camera.position.set(7, 6, 11);
    camera.lookAt(0, 0.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    if (settings.showGrid) {
      scene.add(new THREE.GridHelper(22, 22, new THREE.Color('#1c2b42'), new THREE.Color('#101b2b')));
    }

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshStandardMaterial({ color: '#0b111c', roughness: 0.92, metalness: 0.04 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    floor.receiveShadow = true;
    scene.add(floor);

    scene.add(new THREE.HemisphereLight('#bcd3ff', '#0b0e14', 1.2));
    const dir = new THREE.DirectionalLight('#ffffff', settings.lightIntensity);
    dir.position.set(8, 14, 7);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 40;
    dir.shadow.camera.left = -16;
    dir.shadow.camera.right = 16;
    dir.shadow.camera.top = 16;
    dir.shadow.camera.bottom = -16;
    scene.add(dir);

    const viewportGroup = new THREE.Group();
    viewportGroup.add(nodeObjects.clone());
    scene.add(viewportGroup);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let yaw = 0.62;
    let pitch = -0.28;
    let distance = 15;
    const target = new THREE.Vector3(0, 0.2, 0);
    let isPointerDown = false;
    let startX = 0;
    let startY = 0;

    const updateCamera = () => {
      const x = target.x + distance * Math.sin(yaw) * Math.cos(pitch);
      const y = target.y + distance * Math.sin(pitch);
      const z = target.z + distance * Math.cos(yaw) * Math.cos(pitch);
      camera.position.set(x, y, z);
      camera.lookAt(target);
    };
    updateCamera();

    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const down = (event: PointerEvent) => { isPointerDown = true; startX = event.clientX; startY = event.clientY; };
    const move = (event: PointerEvent) => {
      if (!isPointerDown) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      startX = event.clientX;
      startY = event.clientY;
      yaw += dx * 0.008;
      pitch = Math.max(-1.25, Math.min(1.25, pitch - dy * 0.008));
      updateCamera();
    };
    const up = () => { isPointerDown = false; };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      distance = Math.max(4, Math.min(34, distance * (event.deltaY > 0 ? 1.08 : 0.92)));
      updateCamera();
    };
    const select = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObjects(viewportGroup.children, true);
      for (const hit of intersections) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          const nodeId = obj.userData?.nodeId;
          if (typeof nodeId === 'string') { selectNetworkNode(nodeId); return; }
          obj = obj.parent;
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointermove', move);
    renderer.domElement.addEventListener('pointerup', up);
    renderer.domElement.addEventListener('wheel', wheel);
    renderer.domElement.addEventListener('pointerdown', select);
    window.addEventListener('resize', resize);
    resize();

    let frame = 0;
    let raf = 0;
    const animate = () => {
      frame += 1;
      const t = frame * 0.001;
      viewportGroup.children.forEach((child, index) => {
        if (child.type === 'Mesh') child.rotation.y = t * 0.08 + index * 0.02;
      });
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      renderer.domElement.removeEventListener('pointerdown', down);
      renderer.domElement.removeEventListener('pointermove', move);
      renderer.domElement.removeEventListener('pointerup', up);
      renderer.domElement.removeEventListener('wheel', wheel);
      renderer.domElement.removeEventListener('pointerdown', select);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [nodeObjects, nodes, edges, renderMode, selectNetworkNode, settings.showGrid, settings.lightIntensity]);

  useEffect(() => {
    if (renderMode === '3d') return;
    const canvas = canvas2dRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let frame = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, rect.width * ratio);
      canvas.height = Math.max(1, rect.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      frame += 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      ctx.clearRect(0, 0, width, height);

      const bg = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, Math.max(width, height));
      bg.addColorStop(0, '#0c1524');
      bg.addColorStop(1, '#050810');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      if (settings.showGrid) {
        const gridSize = 70;
        ctx.strokeStyle = 'rgba(120,170,255,0.09)';
        ctx.lineWidth = 1;
        for (let x = -width; x < width * 2; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
        for (let y = -height; y < height * 2; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
      }

      const projected = new Map<string, { x: number; y: number; scale: number; z: number }>();
      nodes.forEach((node, index) => {
        const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2;
        const base = node.position ?? { x: 400 + Math.cos(angle) * 220, y: 300 + Math.sin(angle) * 170 };
        const z = node.position?.y ?? index * 12;

        if (renderMode === '2d') {
          projected.set(node.id, { x: base.x, y: base.y, scale: 1, z: 0 });
        } else {
          const depth = Math.max(0.35, 1 - z / 520);
          projected.set(node.id, { x: (base.x - width / 2) * depth + width / 2, y: (base.y - height / 2) * depth + height / 2 - z * 0.28, scale: depth, z });
        }
      });

      ctx.strokeStyle = 'rgba(80,160,255,0.32)';
      ctx.lineWidth = 2;
      for (const edge of edges) {
        const a = projected.get(edge.source);
        const b = projected.get(edge.target);
        if (!a || !b) continue;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }

      const sorted = Array.from(projected.entries()).sort((a, b) => a[1].y - b[1].y);
      for (const [id, p] of sorted) {
        const node = nodes.find((entry) => entry.id === id);
        if (!node) continue;
        const color = TYPE_META[node.type]?.color ?? TYPE_META.other.color;
        const size = 32 * p.scale;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fillStyle = `${color}26`;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.stroke();
        ctx.fillStyle = '#f5f7fb';
        ctx.font = `${Math.max(10, 12 * p.scale)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(node.label ?? id, 0, -(size + 9));
        ctx.fillStyle = '#8f9bb3';
        ctx.fillText(node.type ?? 'other', 0, -(size - 3));
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [renderMode, nodes, edges, settings.showGrid]);

  return (
    <div className="webgl-viewport">
      <div ref={webglRef} className={`render-layer webgl-layer ${renderMode === '3d' ? 'active' : ''}`} />
      <canvas ref={canvas2dRef} className={`render-layer canvas-layer ${renderMode !== '3d' ? 'active' : ''}`} />
      <div className="viewport-mode-label"><span className="mode-dot" />{renderMode.toUpperCase()}</div>
      <div className="viewport-help"><span>Mode: {renderMode.toUpperCase()}</span><span>Click node: select</span></div>
    </div>
  );
}
