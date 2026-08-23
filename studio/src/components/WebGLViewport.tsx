import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useStudio } from '../studio/StudioContext';

const TYPE_META: Record<string, { color: string; geometry: 'box' | 'sphere' | 'cylinder' | 'capsule' }> = {
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

export function WebGLViewport(): JSX.Element {
  const { state, selectNetworkNode } = useStudio();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [modeLabel, setModeLabel] = useState('3D');

  const nodes = state.networkNodes;
  const edges = state.networkEdges;

  const nodeObjects = useMemo(() => {
    const map = new Map<string, THREE.Object3D>();
    const group = new THREE.Group();

    nodes.forEach((node, index) => {
      const meta = TYPE_META[node.type] ?? TYPE_META.other;
      const color = new THREE.Color(meta.color);
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.45,
        metalness: 0.25,
      });

      let geometry: THREE.BufferGeometry;
      switch (meta.geometry) {
        case 'sphere':
          geometry = new THREE.SphereGeometry(0.8, 24, 18);
          break;
        case 'cylinder':
          geometry = new THREE.CylinderGeometry(0.65, 0.65, 1.8, 24);
          break;
        case 'capsule':
          geometry = new THREE.CapsuleGeometry(0.55, 0.9, 8, 16);
          break;
        default:
          geometry = new THREE.BoxGeometry(1.3, 1.0, 1.3);
          break;
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        node.position?.x ? (node.position.x - 400) / 120 : (index % 5) * 2.4 - 4.8,
        node.position?.y ? 0.5 : 0.5,
        node.position?.y ? (node.position.y - 300) / 120 : Math.floor(index / 5) * 2.4 - 2.4,
      );
      mesh.userData = { nodeId: node.id };
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const wireframe = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45 }),
      );
      mesh.add(wireframe);

      group.add(mesh);
      map.set(node.id, mesh);
    });

    edges.forEach((edge, index) => {
      const source = map.get(edge.source);
      const target = map.get(edge.target);
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

      const lineGeometry = new THREE.CylinderGeometry(0.03, 0.03, distance, 6);
      const lineMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#55aaff'),
        transparent: true,
        opacity: 0.35,
      });
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.position.copy(mid);
      line.quaternion.copy(quaternion);
      line.userData = { edgeId: edge.id };
      group.add(line);
    });

    return group;
  }, [nodes, edges]);

  useEffect(() => {
    const container = containerRef.current;
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

    const grid = new THREE.GridHelper(22, 22, new THREE.Color('#1c2b42'), new THREE.Color('#101b2b'));
    scene.add(grid);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 22),
      new THREE.MeshStandardMaterial({ color: '#0b111c', roughness: 0.92, metalness: 0.04 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    floor.receiveShadow = true;
    scene.add(floor);

    const hemi = new THREE.HemisphereLight('#bcd3ff', '#0b0e14', 1.2);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight('#ffffff', 3.2);
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
    scene.add(viewportGroup);

    const replaceContent = (): void => {
      while (viewportGroup.children.length > 0) {
        viewportGroup.remove(viewportGroup.children[0]);
      }
      viewportGroup.add(nodeObjects.clone());
    };
    replaceContent();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    let isPointerDown = false;
    let startX = 0;
    let startY = 0;
    let yaw = 0.62;
    let pitch = -0.28;
    let distance = 15;
    let target = new THREE.Vector3(0, 0.2, 0);

    const updateCamera = (): void => {
      const x = target.x + distance * Math.sin(yaw) * Math.cos(pitch);
      const y = target.y + distance * Math.sin(pitch);
      const z = target.z + distance * Math.cos(yaw) * Math.cos(pitch);
      camera.position.set(x, y, z);
      camera.lookAt(target);
    };

    updateCamera();

    const resize = (): void => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const handlePointerDown = (event: PointerEvent): void => {
      isPointerDown = true;
      startX = event.clientX;
      startY = event.clientY;
      (event.target as HTMLElement)?.setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent): void => {
      if (!isPointerDown) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      startX = event.clientX;
      startY = event.clientY;

      if (event.shiftKey) {
        const panScale = distance * 0.002;
        const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
        target.addScaledVector(right, -dx * panScale);
        target.addScaledVector(forward, dy * panScale);
      } else {
        yaw += dx * 0.008;
        pitch = Math.max(-1.25, Math.min(1.25, pitch - dy * 0.008));
      }
      updateCamera();
    };

    const handlePointerUp = (event: PointerEvent): void => {
      isPointerDown = false;
      (event.target as HTMLElement)?.releasePointerCapture?.(event.pointerId);
    };

    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();
      distance = Math.max(4, Math.min(34, distance * (event.deltaY > 0 ? 1.08 : 0.92)));
      updateCamera();
    };

    const handlePointerDownForSelection = (event: PointerEvent): void => {
      if (event.button !== 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const intersections = raycaster.intersectObjects(viewportGroup.children, true);
      for (const intersection of intersections) {
        let object: THREE.Object3D | null = intersection.object;
        while (object) {
          const nodeId = object.userData?.nodeId;
          if (typeof nodeId === 'string') {
            selectNetworkNode(nodeId);
            return;
          }
          object = object.parent;
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('wheel', handleWheel);
    renderer.domElement.addEventListener('pointerdown', handlePointerDownForSelection);

    window.addEventListener('resize', resize);
    resize();

    let animationFrame = 0;
    let frame = 0;
    const render = (): void => {
      frame += 1;
      const t = frame * 0.001;
      viewportGroup.children.forEach((child, index) => {
        if (child.type === 'Mesh') {
          child.rotation.y = t * 0.08 + index * 0.02;
        }
      });
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDownForSelection);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [nodeObjects, selectNetworkNode]);

  return (
    <div className="webgl-viewport" ref={containerRef}>
      <div className="viewport-mode-label">
        <span className="mode-dot" />
        {modeLabel}
      </div>
      <div className="viewport-help">
        <span>Left-drag: orbit</span>
        <span>Shift+drag: pan</span>
        <span>Wheel: zoom</span>
        <span>Click node: select</span>
      </div>
    </div>
  );
}
