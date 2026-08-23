import { useEffect, useRef, useState } from 'react';

import * as THREE from 'three';
import type {
  NetworkGraphEdge,
  NetworkGraphNode,
} from '@cyre/engine';

import { useStudio } from '../studio/StudioContext';
import {
  graphFromWorld,
  visualForType,
  worldFromGraph,
} from '../rendering/entityVisuals';

export interface ViewportSettings {
  showGrid: boolean;
  showWireframe: boolean;
  showLabels: boolean;
  lightIntensity: number;
}

interface CyreViewportProps {
  settings: ViewportSettings;
}

interface Camera2DState {
  x: number;
  y: number;
  zoom: number;
}

interface OrbitState {
  yaw: number;
  pitch: number;
  distance: number;
  target: THREE.Vector3;
}

const NODE_RADIUS = 28;

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
    } else if (material) {
      material.dispose();
    }
  });
}

function createGeometry(kind: 'box' | 'sphere' | 'cylinder'): THREE.BufferGeometry {
  if (kind === 'sphere') return new THREE.SphereGeometry(0.72, 28, 20);
  if (kind === 'cylinder') return new THREE.CylinderGeometry(0.55, 0.55, 1.55, 28);
  return new THREE.BoxGeometry(1.2, 1.05, 1.2);
}

export function CyreViewport({ settings }: CyreViewportProps): JSX.Element {
  const {
    state,
    selectNetworkNode,
    addNetworkNodeFromPalette,
    moveNetworkNode,
    connectNetworkNodes,
    removeNetworkNode,
    removeNetworkEdge,
  } = useStudio();

  const renderMode = state.renderMode ?? '3d';
  const selectedId = state.inspectorTarget?.id ?? null;
  const nodes = state.networkNodes;
  const edges = state.networkEdges;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const webglRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    kind: 'node' | 'edge' | 'canvas';
    id?: string;
  } | null>(null);
  const [stats, setStats] = useState({ fps: 0, draws: 0 });
  const [connectSource, setConnectSource] = useState<string | null>(null);

  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    nodeGroup: THREE.Group;
    edgeGroup: THREE.Group;
    grid: THREE.Object3D;
    key: THREE.DirectionalLight;
    sync: (
      nextNodes: NetworkGraphNode[],
      nextEdges: NetworkGraphEdge[],
      nextSettings: ViewportSettings,
      nextSelected: string | null,
    ) => void;
  } | null>(null);
  const selectRef = useRef(selectNetworkNode);
  const addRef = useRef(addNetworkNodeFromPalette);
  const sceneStateRef = useRef({ nodes, edges, settings, selectedId });
  selectRef.current = selectNetworkNode;
  addRef.current = addNetworkNodeFromPalette;
  sceneStateRef.current = { nodes, edges, settings, selectedId };

  useEffect(() => {
    if (renderMode !== '3d') {
      threeRef.current = null;
      return;
    }
    const container = webglRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#061428');
    scene.fog = new THREE.FogExp2('#061428', 0.028);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.08, 240);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.replaceChildren(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';

    scene.add(new THREE.HemisphereLight('#b7d7ff', '#07101f', 1.15));

    const key = new THREE.DirectionalLight('#ffffff', 2.4);
    key.position.set(9, 14, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 48;
    key.shadow.camera.left = -18;
    key.shadow.camera.right = 18;
    key.shadow.camera.top = 18;
    key.shadow.camera.bottom = -18;
    scene.add(key);

    const rim = new THREE.DirectionalLight('#4da3ff', 0.55);
    rim.position.set(-10, 6, -8);
    scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(18, 64),
      new THREE.MeshStandardMaterial({
        color: '#0a1833',
        roughness: 0.92,
        metalness: 0.08,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(24, 24, '#1d4f8a', '#10284d');
    grid.position.y = 0.01;
    scene.add(grid);

    const nodeGroup = new THREE.Group();
    const edgeGroup = new THREE.Group();
    scene.add(edgeGroup);
    scene.add(nodeGroup);

    const orbit: OrbitState = {
      yaw: 0.72,
      pitch: 0.42,
      distance: 14.5,
      target: new THREE.Vector3(0, 0.35, 0),
    };

    const updateCamera = (): void => {
      const x = orbit.target.x + orbit.distance * Math.sin(orbit.yaw) * Math.cos(orbit.pitch);
      const y = orbit.target.y + orbit.distance * Math.sin(orbit.pitch);
      const z = orbit.target.z + orbit.distance * Math.cos(orbit.yaw) * Math.cos(orbit.pitch);
      camera.position.set(x, y, z);
      camera.lookAt(orbit.target);
    };
    updateCamera();

    const resize = (): void => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragging = false;
    let panning = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;

    const setPointer = (event: PointerEvent): void => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const pickNode = (event: PointerEvent): string | null => {
      setPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(nodeGroup.children, true);
      for (const hit of hits) {
        let current: THREE.Object3D | null = hit.object;
        while (current) {
          const nodeId = current.userData.nodeId;
          if (typeof nodeId === 'string') return nodeId;
          current = current.parent;
        }
      }
      return null;
    };

    const worldOnFloor = (event: PointerEvent): { x: number; y: number } | null => {
      setPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const point = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(plane, point)) return null;
      return graphFromWorld(point.x, point.z);
    };

    const onPointerDown = (event: PointerEvent): void => {
      moved = false;
      lastX = event.clientX;
      lastY = event.clientY;
      if (event.button === 1 || event.button === 2 || event.shiftKey) {
        panning = true;
      } else if (event.button === 0) {
        dragging = true;
      }
    };

    const onPointerMove = (event: PointerEvent): void => {
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      lastX = event.clientX;
      lastY = event.clientY;

      if (panning) {
        const panScale = orbit.distance * 0.0022;
        const right = new THREE.Vector3();
        camera.getWorldDirection(right);
        right.cross(camera.up).normalize();
        const look = new THREE.Vector3().subVectors(orbit.target, camera.position).normalize();
        const up = new THREE.Vector3().crossVectors(right, look).normalize();
        orbit.target.addScaledVector(right, -dx * panScale);
        orbit.target.addScaledVector(up, dy * panScale);
        updateCamera();
        return;
      }

      if (dragging) {
        orbit.yaw -= dx * 0.0075;
        orbit.pitch = Math.max(0.12, Math.min(1.25, orbit.pitch + dy * 0.0075));
        updateCamera();
      }
    };

    const onPointerUp = (event: PointerEvent): void => {
      if (!moved && event.button === 0) {
        const nodeId = pickNode(event);
        if (nodeId) selectRef.current(nodeId);
      }
      dragging = false;
      panning = false;
    };

    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 1.08 : 0.92;
      orbit.distance = Math.max(5, Math.min(36, orbit.distance * factor));
      updateCamera();
    };

    const onContext = (event: MouseEvent): void => {
      event.preventDefault();
      const nodeId = pickNode(event as PointerEvent);
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        kind: nodeId ? 'node' : 'canvas',
        id: nodeId ?? undefined,
      });
    };

    const onDrop = (event: DragEvent): void => {
      event.preventDefault();
      const itemId = event.dataTransfer?.getData('application/x-cyre-entity');
      if (!itemId) return;
      const point = worldOnFloor(event as unknown as PointerEvent);
      if (!point) return;
      addRef.current(itemId, point.x, point.y);
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.addEventListener('contextmenu', onContext);
    renderer.domElement.addEventListener('dragover', (event) => event.preventDefault());
    renderer.domElement.addEventListener('drop', onDrop);

    const sync = (
      nextNodes: NetworkGraphNode[],
      nextEdges: NetworkGraphEdge[],
      nextSettings: ViewportSettings,
      nextSelected: string | null,
    ): void => {
      while (nodeGroup.children.length > 0) {
        const child = nodeGroup.children[0];
        disposeObject(child);
        nodeGroup.remove(child);
      }
      while (edgeGroup.children.length > 0) {
        const child = edgeGroup.children[0];
        disposeObject(child);
        edgeGroup.remove(child);
      }

      const meshes = new Map<string, THREE.Object3D>();

      nextNodes.forEach((node, index) => {
        const visual = visualForType(node.type);
        const world = worldFromGraph(node.position?.x, node.position?.y, index);
        const geometry = createGeometry(visual.geometry);
        const selected = nextSelected === node.id;
        const material = new THREE.MeshStandardMaterial({
          color: visual.color,
          roughness: 0.38,
          metalness: 0.28,
          emissive: selected ? new THREE.Color(visual.color) : new THREE.Color('#000000'),
          emissiveIntensity: selected ? 0.35 : 0.04,
        });
        const mesh = new THREE.Mesh(geometry, material);
        const baseY = visual.geometry === 'sphere' || visual.geometry === 'cylinder' ? 0.78 : 0.54;
        mesh.position.set(world.x, baseY, world.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { nodeId: node.id, baseY };

        if (nextSettings.showWireframe) {
          mesh.add(
            new THREE.LineSegments(
              new THREE.EdgesGeometry(geometry),
              new THREE.LineBasicMaterial({
                color: visual.color,
                transparent: true,
                opacity: 0.45,
              }),
            ),
          );
        }

        if (nextSettings.showLabels) {
          const sprite = makeLabelSprite(node.label, visual.color);
          sprite.position.set(0, 1.35, 0);
          mesh.add(sprite);
        }

        nodeGroup.add(mesh);
        meshes.set(node.id, mesh);
      });

      nextEdges.forEach((edge) => {
        const source = meshes.get(edge.source);
        const target = meshes.get(edge.target);
        if (!source || !target) return;
        const start = source.position.clone();
        const end = target.position.clone();
        const distance = start.distanceTo(end);
        const mid = start.clone().add(end).multiplyScalar(0.5);
        const direction = end.clone().sub(start).normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction,
        );
        const line = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.035, Math.max(0.01, distance), 8),
          new THREE.MeshBasicMaterial({
            color: '#4da3ff',
            transparent: true,
            opacity: 0.42,
          }),
        );
        line.position.copy(mid);
        line.quaternion.copy(quaternion);
        edgeGroup.add(line);
      });

      grid.visible = nextSettings.showGrid;
      key.intensity = nextSettings.lightIntensity;
    };

    threeRef.current = { scene, camera, renderer, nodeGroup, edgeGroup, grid, key, sync };
    sync(
      sceneStateRef.current.nodes,
      sceneStateRef.current.edges,
      sceneStateRef.current.settings,
      sceneStateRef.current.selectedId,
    );

    let frame = 0;
    let raf = 0;
    let lastStamp = performance.now();
    let fpsAccum = 0;
    let fpsFrames = 0;

    const animate = (now: number): void => {
      frame += 1;
      const dt = now - lastStamp;
      lastStamp = now;
      fpsAccum += dt;
      fpsFrames += 1;
      if (fpsAccum >= 400) {
        setStats({
          fps: Math.round((fpsFrames * 1000) / fpsAccum),
          draws: nodeGroup.children.length,
        });
        fpsAccum = 0;
        fpsFrames = 0;
      }

      nodeGroup.children.forEach((child, index) => {
        child.position.y = (child.userData.baseY ?? 0.55) + Math.sin(frame * 0.012 + index) * 0.035;
      });

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('contextmenu', onContext);
      renderer.domElement.removeEventListener('drop', onDrop);
      disposeObject(scene);
      renderer.dispose();
      threeRef.current = null;
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [renderMode]);

  useEffect(() => {
    threeRef.current?.sync(nodes, edges, settings, selectedId);
  }, [edges, nodes, selectedId, settings]);

  const canvasStateRef = useRef({
    nodes,
    edges,
    settings,
    selectedId,
    connectSource,
    renderMode,
  });
  canvasStateRef.current = {
    nodes,
    edges,
    settings,
    selectedId,
    connectSource,
    renderMode,
  };
  const moveRef = useRef(moveNetworkNode);
  const connectRef = useRef(connectNetworkNodes);
  moveRef.current = moveNetworkNode;
  connectRef.current = connectNetworkNodes;

  useEffect(() => {
    if (renderMode === '3d') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const camera: Camera2DState = { x: 48, y: 36, zoom: 1 };
    const dragOverride = new Map<string, { x: number; y: number }>();
    let raf = 0;
    let draggingCanvas = false;
    let draggingNodeId: string | null = null;
    let lastX = 0;
    let lastY = 0;
    let moved = false;
    let fpsAccum = 0;
    let fpsFrames = 0;
    let lastStamp = performance.now();

    const resize = (): void => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const screenToWorld = (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left - camera.x) / camera.zoom,
        y: (clientY - rect.top - camera.y) / camera.zoom,
      };
    };

    const currentNodes = (): NetworkGraphNode[] => canvasStateRef.current.nodes;
    const currentEdges = (): NetworkGraphEdge[] => canvasStateRef.current.edges;

    const project = (node: NetworkGraphNode, index: number): { x: number; y: number; scale: number } => {
      const override = dragOverride.get(node.id);
      const baseX = override?.x ?? node.position?.x ?? 140 + (index % 5) * 160;
      const baseY = override?.y ?? node.position?.y ?? 120 + Math.floor(index / 5) * 140;

      if (canvasStateRef.current.renderMode === '2d') {
        return {
          x: baseX * camera.zoom + camera.x,
          y: baseY * camera.zoom + camera.y,
          scale: camera.zoom,
        };
      }

      const depth = Math.max(0.42, 1 - (baseY / 980));
      return {
        x: (baseX - 80) * depth * camera.zoom + camera.x + 80,
        y: (baseY * 0.62 - 18) * camera.zoom + camera.y,
        scale: depth * camera.zoom,
      };
    };

    const hitTest = (clientX: number, clientY: number): string | null => {
      const rect = canvas.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      const liveNodes = currentNodes();
      for (let index = liveNodes.length - 1; index >= 0; index -= 1) {
        const node = liveNodes[index];
        const point = project(node, index);
        const radius = NODE_RADIUS * point.scale;
        const dx = sx - point.x;
        const dy = sy - point.y;
        if (dx * dx + dy * dy <= radius * radius) return node.id;
      }
      return null;
    };

    const draw = (now: number): void => {
      const dt = now - lastStamp;
      lastStamp = now;
      fpsAccum += dt;
      fpsFrames += 1;
      if (fpsAccum >= 400) {
        setStats({
          fps: Math.round((fpsFrames * 1000) / fpsAccum),
          draws: currentNodes().length,
        });
        fpsAccum = 0;
        fpsFrames = 0;
      }

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      ctx.clearRect(0, 0, width, height);

      const bg = ctx.createRadialGradient(width * 0.5, height * 0.42, 40, width * 0.5, height * 0.5, Math.max(width, height));
      bg.addColorStop(0, '#0c2348');
      bg.addColorStop(1, '#040c1c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const frameSettings = canvasStateRef.current.settings;
      const frameSelected = canvasStateRef.current.selectedId;
      const frameConnect = canvasStateRef.current.connectSource;
      const frameMode = canvasStateRef.current.renderMode;
      const liveNodes = currentNodes();
      const liveEdges = currentEdges();

      if (frameSettings.showGrid) {
        const size = 72 * camera.zoom;
        ctx.strokeStyle = 'rgba(90, 160, 255, 0.09)';
        ctx.lineWidth = 1;
        const offsetX = camera.x % size;
        const offsetY = camera.y % size;
        for (let x = offsetX; x < width; x += size) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = offsetY; y < height; y += size) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      const projected = new Map<string, { x: number; y: number; scale: number }>();
      liveNodes.forEach((node, index) => {
        projected.set(node.id, project(node, index));
      });

      ctx.lineWidth = frameMode === '2.5d' ? 2.4 : 2;
      for (const edge of liveEdges) {
        const a = projected.get(edge.source);
        const b = projected.get(edge.target);
        if (!a || !b) continue;
        ctx.strokeStyle = 'rgba(77, 163, 255, 0.38)';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        if (frameMode === '2.5d') {
          const midX = (a.x + b.x) / 2;
          const midY = Math.min(a.y, b.y) - 28 * camera.zoom;
          ctx.quadraticCurveTo(midX, midY, b.x, b.y);
        } else {
          ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
      }

      const sorted = [...liveNodes].sort((left, right) => {
        const a = projected.get(left.id);
        const b = projected.get(right.id);
        return (a?.y ?? 0) - (b?.y ?? 0);
      });

      for (const node of sorted) {
        const point = projected.get(node.id);
        if (!point) continue;
        const visual = visualForType(node.type);
        const selected = frameSelected === node.id || frameConnect === node.id;
        const radius = NODE_RADIUS * point.scale;

        ctx.save();
        ctx.translate(point.x, point.y);

        if (frameMode === '2.5d') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
          ctx.beginPath();
          ctx.ellipse(0, radius * 0.95, radius * 0.85, radius * 0.28, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.shadowColor = visual.color;
        ctx.shadowBlur = selected ? 28 : 16;
        ctx.beginPath();
        if (node.type === 'firewall') {
          ctx.moveTo(0, -radius);
          ctx.lineTo(radius, 0);
          ctx.lineTo(0, radius);
          ctx.lineTo(-radius, 0);
          ctx.closePath();
        } else if (node.type === 'database') {
          ctx.roundRect(-radius * 0.78, -radius * 0.7, radius * 1.56, radius * 1.4, 10);
        } else if (node.type === 'router' || node.type === 'service' || node.type === 'network') {
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
        } else {
          ctx.roundRect(-radius * 0.86, -radius * 0.72, radius * 1.72, radius * 1.44, 12);
        }
        ctx.fillStyle = `${visual.color}33`;
        ctx.fill();
        ctx.lineWidth = selected ? 3 : 2;
        ctx.strokeStyle = selected ? '#ffffff' : visual.color;
        ctx.stroke();

        if (frameSettings.showLabels) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#eaf2ff';
          ctx.font = `600 ${Math.max(11, 12.5 * point.scale)}px "SF Pro Text", Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(node.label, 0, -(radius + 10));
          ctx.fillStyle = '#8ba4c7';
          ctx.font = `${Math.max(9, 10.5 * point.scale)}px "SF Pro Text", Inter, sans-serif`;
          ctx.fillText(node.type, 0, radius + 16);
        }

        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };

    const onPointerDown = (event: PointerEvent): void => {
      moved = false;
      lastX = event.clientX;
      lastY = event.clientY;
      const hit = hitTest(event.clientX, event.clientY);
      if (hit && event.button === 0 && !event.shiftKey) {
        draggingNodeId = hit;
        selectRef.current(hit);
      } else if (event.button === 0 || event.button === 1) {
        draggingCanvas = true;
      }
    };

    const onPointerMove = (event: PointerEvent): void => {
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      lastX = event.clientX;
      lastY = event.clientY;

      if (draggingNodeId) {
        const world = screenToWorld(event.clientX, event.clientY);
        dragOverride.set(draggingNodeId, world);
        return;
      }

      if (draggingCanvas) {
        camera.x += dx;
        camera.y += dy;
      }
    };

    const onPointerUp = (event: PointerEvent): void => {
      const hit = hitTest(event.clientX, event.clientY);
      if (draggingNodeId && moved) {
        const world = dragOverride.get(draggingNodeId);
        if (world) moveRef.current(draggingNodeId, world.x, world.y);
        dragOverride.delete(draggingNodeId);
      } else if (!moved && event.shiftKey && hit) {
        setConnectSource((current) => {
          if (current && current !== hit) {
            connectRef.current(current, hit);
            return null;
          }
          return hit;
        });
      } else if (!moved && hit) {
        selectRef.current(hit);
      }
      draggingCanvas = false;
      draggingNodeId = null;
    };

    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      const worldX = (mouseX - camera.x) / camera.zoom;
      const worldY = (mouseY - camera.y) / camera.zoom;
      const nextZoom = Math.min(3.2, Math.max(0.28, camera.zoom * (event.deltaY > 0 ? 0.9 : 1.1)));
      camera.zoom = nextZoom;
      camera.x = mouseX - worldX * nextZoom;
      camera.y = mouseY - worldY * nextZoom;
    };

    const onContext = (event: MouseEvent): void => {
      event.preventDefault();
      const liveNodes = currentNodes();
      const hit = hitTest(event.clientX, event.clientY);
      const edge = !hit
        ? currentEdges().find((entry) => {
            const sourceIndex = liveNodes.findIndex((node) => node.id === entry.source);
            const targetIndex = liveNodes.findIndex((node) => node.id === entry.target);
            if (sourceIndex < 0 || targetIndex < 0) return false;
            const a = project(liveNodes[sourceIndex], sourceIndex);
            const b = project(liveNodes[targetIndex], targetIndex);
            const rect = canvas.getBoundingClientRect();
            const px = event.clientX - rect.left;
            const py = event.clientY - rect.top;
            return distanceToSegment(px, py, a.x, a.y, b.x, b.y) < 8;
          })
        : undefined;

      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        kind: hit ? 'node' : edge ? 'edge' : 'canvas',
        id: hit ?? edge?.id,
      });
    };

    const onDrop = (event: DragEvent): void => {
      event.preventDefault();
      const itemId = event.dataTransfer?.getData('application/x-cyre-entity');
      if (!itemId) return;
      const world = screenToWorld(event.clientX, event.clientY);
      addNetworkNodeFromPalette(itemId, world.x, world.y);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContext);
    canvas.addEventListener('dragover', (event) => event.preventDefault());
    canvas.addEventListener('drop', onDrop);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContext);
      canvas.removeEventListener('drop', onDrop);
    };
  }, [renderMode]);

  useEffect(() => {
    const close = (): void => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  return (
    <div ref={rootRef} className="cyre-stage">
      <div
        ref={webglRef}
        className={`stage-layer${renderMode === '3d' ? ' active' : ''}`}
      />
      <canvas
        ref={canvasRef}
        className={`stage-layer canvas-layer${renderMode !== '3d' ? ' active' : ''}`}
      />

      <div className="stage-overlay top-left glass">
        <span className="mode-dot" />
        <strong>{renderMode.toUpperCase()}</strong>
        <span>{stats.fps} fps</span>
        <span>{nodes.length} entities</span>
      </div>

      <div className="stage-overlay bottom-right glass">
        <span>
          {renderMode === '3d'
            ? 'LMB orbit · RMB/Shift pan · Wheel zoom · Click select'
            : 'Drag pan · Drag node · Shift+click connect · Wheel zoom'}
        </span>
      </div>

      {nodes.length === 0 && (
        <div className="stage-empty">
          <strong>Empty scene</strong>
          <span>Drop an entity from the palette or create one in the Outliner.</span>
        </div>
      )}

      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {contextMenu.kind === 'node' && contextMenu.id && (
            <>
              <button
                type="button"
                className="context-menu-item"
                onClick={() => {
                  selectNetworkNode(contextMenu.id!);
                  setContextMenu(null);
                }}
              >
                Inspect
              </button>
              <button
                type="button"
                className="context-menu-item danger"
                onClick={() => {
                  removeNetworkNode(contextMenu.id!);
                  setContextMenu(null);
                }}
              >
                Delete Entity
              </button>
            </>
          )}
          {contextMenu.kind === 'edge' && contextMenu.id && (
            <button
              type="button"
              className="context-menu-item danger"
              onClick={() => {
                removeNetworkEdge(contextMenu.id!);
                setContextMenu(null);
              }}
            >
              Delete Link
            </button>
          )}
          {contextMenu.kind === 'canvas' && (
            <div className="context-menu-item" style={{ pointerEvents: 'none' }}>
              Scene · {renderMode.toUpperCase()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function makeLabelSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = 'rgba(6, 20, 40, 0.72)';
    ctx.roundRect(16, 10, 224, 44, 12);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = '#eaf2ff';
    ctx.font = '600 22px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.slice(0, 18), 128, 32);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.4, 0.6, 1);
  return sprite;
}

function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = dx * dx + dy * dy;
  if (length === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / length));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export type { NetworkGraphEdge, NetworkGraphNode };
