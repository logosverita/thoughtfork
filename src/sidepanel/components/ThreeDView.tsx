import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ThoughtForkData, Message } from '../../shared/types';
import { truncate } from '../../shared/utils';

interface Props {
  data: ThoughtForkData | null;
  searchQuery?: string;
  selectedTags?: string[];
  onNodeClick?: (message: Message) => void;
}

export function ThreeDView({ data, searchQuery, selectedTags, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const nodesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  useEffect(() => {
    if (!data || !containerRef.current) return;

    const container = containerRef.current;

    // シーン初期化
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050510, 0.002);
    sceneRef.current = scene;

    // カメラ
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    camera.position.z = 100;
    camera.position.y = 50;
    cameraRef.current = camera;

    // レンダラー
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // コントロール
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    // - - - - - [ Starfield ] - - - - -
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 2000;
    const posArray = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 1000;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const starsMaterial = new THREE.PointsMaterial({
      size: 1.5,
      color: 0x88ccff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const starMesh = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starMesh);

    // - - - - - [ Nodes ] - - - - -
    const nodePositions = new Map<string, THREE.Vector3>();
    nodesRef.current.clear();

    data.messages.forEach((message, index) => {
      // 螺旋配置
      const angle = index * 0.5;
      const radius = 20 + index * 0.8;
      const y = index * 3 - data.messages.length * 1.5;

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const position = new THREE.Vector3(x, y, z);
      nodePositions.set(message.id, position);

      // ノードメッシュ
      const color = message.role === 'human' ? 0x3b82f6 : 0x10b981;
      const geometry = new THREE.IcosahedronGeometry(message.isBranchPoint ? 2 : 1.2, 1);
      const material = new THREE.MeshBasicMaterial({
        color: color,
        wireframe: true,
        transparent: true,
        opacity: 0.6,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.userData = { id: message.id, message: message }; // raycaster用

      // グロー効果（内部の光る球体）
      const glowGeo = new THREE.SphereGeometry(message.isBranchPoint ? 1.5 : 0.8, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.9,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      mesh.add(glowMesh);

      // テキストラベル (Sprite)
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = 256;
        canvas.height = 64;
        context.font = 'Bold 24px Arial';
        context.fillStyle = 'rgba(255,255,255,1)';
        context.textAlign = 'center';
        context.fillText(truncate(message.content, 15), 128, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          opacity: 0.7,
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.y = 3;
        sprite.scale.set(10, 2.5, 1);
        mesh.add(sprite);
      }

      scene.add(mesh);
      nodesRef.current.set(message.id, mesh);
    });

    // - - - - - [ Links ] - - - - -
    data.messages.forEach((message) => {
      if (message.parentId) {
        const start = nodePositions.get(message.parentId);
        const end = nodePositions.get(message.id);

        if (start && end) {
          const points = [start, end];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({
            color: 0x4b5563,
            transparent: true,
            opacity: 0.3,
          });
          const line = new THREE.Line(geometry, material);
          scene.add(line);
        }
      }
    });

    // - - - - - [ Raycaster ] - - - - -
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, false); // 再帰なし（親メッシュのみ）

      if (intersects.length > 0) {
        const target = intersects[0].object;
        if (target.userData.message && onNodeClick) {
          onNodeClick(target.userData.message);

          // カメラ移動アニメーション（簡易）
          // const targetPos = target.position.clone().add(new THREE.Vector3(10, 5, 20));
          // TODO: GSAP等でスムーズに動かすのが理想だが、ここでは位置セットのみ
          // controls.target.copy(target.position);
          controls.autoRotate = false;
        }
      } else {
        controls.autoRotate = true;
      }
    };
    renderer.domElement.addEventListener('click', onClick);

    // - - - - - [ Animation Loop ] - - - - -
    let animationId: number;
    function animate() {
      animationId = requestAnimationFrame(animate);

      // スターフィールドの回転
      starMesh.rotation.y += 0.0005;

      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', onClick);
      cancelAnimationFrame(animationId);
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [data]); // dataが変更されたら再構築

  // フィルタリング・検索のハイライト更新
  useEffect(() => {
    if (!nodesRef.current.size) return;

    nodesRef.current.forEach((mesh, _id) => {
      const message = mesh.userData.message as Message;
      const glowMesh = mesh.children[0] as THREE.Mesh; // グロー球体
      const sprite = mesh.children[1] as THREE.Sprite; // テキスト

      let isMatch = true;

      // 検索フィルタ
      if (searchQuery && !message.content.toLowerCase().includes(searchQuery.toLowerCase())) {
        isMatch = false;
      }

      // タグフィルタ
      if (selectedTags && selectedTags.length > 0) {
        // 仮実装: タグIDが含まれているか
        // if (!message.tagIds.some(t => selectedTags.includes(t))) isMatch = false;
      }

      const targetOpacity = isMatch ? 0.9 : 0.1;
      const targetScale = isMatch ? 1 : 0.5;

      // アニメーション的に適用（簡易）
      (mesh.material as THREE.MeshBasicMaterial).opacity = targetOpacity * 0.6;
      if (glowMesh) (glowMesh.material as THREE.MeshBasicMaterial).opacity = targetOpacity;
      if (sprite) sprite.material.opacity = isMatch ? 0.7 : 0;

      mesh.scale.setScalar(targetScale);
    });
  }, [searchQuery, selectedTags]);

  return <div ref={containerRef} className="w-full h-full relative" />;
}
