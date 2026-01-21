import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ThoughtForkData } from '../../shared/types';

interface Props {
  data: ThoughtForkData | null;
}

export function ThreeDView({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // シーン
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);

    // カメラ
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 50;

    // レンダラー
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // コントロール
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // ノードを配置
    const nodePositions = new Map<string, THREE.Vector3>();

    data.messages.forEach((message, index) => {
      const geometry = new THREE.SphereGeometry(
        message.isBranchPoint ? 1.5 : 1,
        32,
        32
      );

      const color = message.color
        ? new THREE.Color(message.color)
        : message.role === 'human'
          ? new THREE.Color(0x3b82f6)
          : new THREE.Color(0x10b981);

      const material = new THREE.MeshBasicMaterial({ color });
      const sphere = new THREE.Mesh(geometry, material);

      // 位置計算（螺旋状に配置）
      const angle = index * 0.5;
      const radius = 10 + index * 0.5;
      const y = index * 2 - data.messages.length;

      sphere.position.set(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      );

      scene.add(sphere);
      nodePositions.set(message.id, sphere.position.clone());
    });

    // エッジを描画
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x4b5563 });

    data.messages.forEach(message => {
      if (message.parentId) {
        const start = nodePositions.get(message.parentId);
        const end = nodePositions.get(message.id);

        if (start && end) {
          const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
          const line = new THREE.Line(geometry, lineMaterial);
          scene.add(line);
        }
      }
    });

    // アニメーション
    let animationId: number;
    function animate() {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // リサイズ対応
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // クリーンアップ
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [data]);

  return (
    <div ref={containerRef} className="w-full h-full" />
  );
}
