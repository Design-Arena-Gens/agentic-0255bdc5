"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

export default function Page() {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const tyreGroupRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  const createTreadBumpTexture = useCallback(() => {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#7a7a7a';
    ctx.fillRect(0, 0, size, size);

    // Draw angular tread blocks for a performance look
    ctx.fillStyle = '#404040';
    const blockW = 40;
    const blockH = 110;
    for (let y = -blockH; y < size + blockH; y += blockH + 10) {
      for (let x = -blockW; x < size + blockW; x += blockW * 2) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((-12 * Math.PI) / 180);
        ctx.fillRect(0, 0, blockW, blockH);
        ctx.restore();

        ctx.save();
        ctx.translate(x + blockW, y + blockH / 2);
        ctx.rotate((12 * Math.PI) / 180);
        ctx.fillRect(0, 0, blockW, blockH);
        ctx.restore();
      }
    }

    // Add fine grooves for texture depth
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    for (let i = 0; i < size; i += 12) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 2);
    texture.anisotropy = 16;
    texture.needsUpdate = true;
    return texture;
  }, []);

  const buildScene = useCallback(() => {
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.Fog(0x0a0a0a, 12, 22);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(6, 3.2, 8.5);
    camera.lookAt(0, 1.4, 0);

    // Studio floor to catch shadows
    const floorGeo = new THREE.PlaneGeometry(40, 40);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Backdrop wall for contrast
    const wallGeo = new THREE.PlaneGeometry(40, 20);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.8, metalness: 0.1 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 10, -8);
    wall.receiveShadow = false;
    scene.add(wall);

    // Lighting: high-contrast, sharp shadows
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(6, 9, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(4096, 4096);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 40;
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -10;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xb0d0ff, 1.1);
    rimLight.position.set(-8, 6, -6);
    rimLight.castShadow = false;
    scene.add(rimLight);

    const fillLight = new THREE.SpotLight(0xffffff, 0.9, 30, THREE.MathUtils.degToRad(35), 0.2, 1);
    fillLight.position.set(0, 8, 10);
    fillLight.target.position.set(0, 1.2, 0);
    fillLight.castShadow = true;
    fillLight.shadow.mapSize.set(2048, 2048);
    fillLight.shadow.bias = -0.0003;
    scene.add(fillLight);
    scene.add(fillLight.target);

    // Tyre group
    const tyreGroup = new THREE.Group();
    tyreGroup.position.set(0, 1.6, 0);
    scene.add(tyreGroup);

    // Tyre body
    const treadBump = createTreadBumpTexture();
    const tyreMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x111111),
      roughness: 0.55,
      metalness: 0.15,
      clearcoat: 0.6,
      clearcoatRoughness: 0.35,
      sheen: 0.0,
      bumpMap: treadBump,
      bumpScale: 0.06,
      envMapIntensity: 1.0,
    });

    const tyre = new THREE.Mesh(
      new THREE.TorusGeometry(2.1, 0.55, 120, 240),
      tyreMaterial
    );
    tyre.castShadow = true;
    tyre.receiveShadow = true;
    tyre.rotation.z = Math.PI / 2;
    tyreGroup.add(tyre);

    // Rim hub
    const rimMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xbbbbbb),
      metalness: 1.0,
      roughness: 0.22,
      reflectivity: 1.0,
      envMapIntensity: 1.2,
    });

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.8, 64), rimMaterial);
    hub.rotation.z = Math.PI / 2;
    hub.castShadow = true;
    hub.receiveShadow = true;
    tyreGroup.add(hub);

    // Spokes
    const spokeGeo = new THREE.BoxGeometry(0.16, 0.5, 2.3);
    const spokeCount = 8;
    for (let i = 0; i < spokeCount; i++) {
      const spoke = new THREE.Mesh(spokeGeo, rimMaterial);
      const angle = (i / spokeCount) * Math.PI * 2;
      spoke.position.set(0, Math.sin(angle) * 0.8, Math.cos(angle) * 0.8);
      spoke.rotation.x = angle;
      spoke.castShadow = true;
      tyreGroup.add(spoke);
    }

    // Small center cap
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.9, 48), rimMaterial);
    cap.rotation.z = Math.PI / 2;
    cap.castShadow = true;
    tyreGroup.add(cap);

    // Subtle tilt for dynamic stance
    tyreGroup.rotation.set(THREE.MathUtils.degToRad(-8), THREE.MathUtils.degToRad(25), 0);

    const render = () => {
      renderer.render(scene, camera);
    };

    // One-time render plus a few frames to settle shadows
    let rafId;
    let frames = 0;
    const animate = () => {
      frames++;
      if (frames < 4) {
        render();
        rafId = requestAnimationFrame(animate);
      } else {
        render();
      }
    };

    animate();

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    tyreGroupRef.current = tyreGroup;
    setIsReady(true);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      render();
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafId);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry?.dispose?.();
          const mat = obj.material;
          if (mat && !Array.isArray(mat)) {
            Object.keys(mat).forEach((k) => {
              if (mat[k] && mat[k].isTexture) mat[k].dispose?.();
            });
            mat.dispose?.();
          }
        }
      });
    };
  }, [createTreadBumpTexture]);

  useEffect(() => {
    const cleanup = buildScene();
    return cleanup;
  }, [buildScene]);

  const downloadPNG = () => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const dataURL = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = 'engineered-elegance.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const rerender = () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;
    renderer.render(scene, camera);
  };

  return (
    <main className="page">
      <div className="actions">
        <button className="btn" onClick={rerender} disabled={!isReady}>Re-render</button>
        <button className="btn primary" onClick={downloadPNG} disabled={!isReady}>Download PNG</button>
      </div>
      <div ref={containerRef} className="canvasWrap" aria-label="Tyre render" />
    </main>
  );
}
