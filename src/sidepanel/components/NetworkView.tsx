import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ThoughtForkData, Message } from '../../shared/types';
import { truncate } from '../../shared/utils';

interface Props {
  data: ThoughtForkData | null;
  onNodeClick?: (message: Message) => void;
  searchQuery?: string;
  selectedTags?: string[];
  activeMessageId?: string | null;
  onNodeDoubleClick?: (message: Message) => void;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  role: 'human' | 'assistant';
  content: string;
  color: string | null;
  isBranchPoint: boolean;
  message: Message; // 全データを保持
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
}

export function NetworkView({ data, onNodeClick, searchQuery, selectedTags, activeMessageId, onNodeDoubleClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);


  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // 定義（フィルターなど）
    const defs = svg.append('defs');

    // ネオングローフィルター
    const filter = defs
      .append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur');

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // ノードとリンクを構築
    const nodes: Node[] = data.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.contentPreview,
      color: m.color,
      isBranchPoint: m.isBranchPoint,
      message: m,
    }));

    const links: Link[] = data.messages
      .filter((m) => m.parentId)
      .map((m) => ({
        source: m.parentId!,
        target: m.id,
      }));

    // メイングループ（ズーム対象）
    const g = svg.append('g');

    // ズーム設定
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg
      .call(zoom)
      .call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8));

    // シミュレーション
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink<Node, Link>(links)
          .id((d) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('collide', d3.forceCollide().radius(40))
      .force('x', d3.forceX(0).strength(0.05))
      .force('y', d3.forceY(0).strength(0.05));

    // リンク描画
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#4b5563')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2);

    // ノードグループ
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, Node>('g')
      .data(nodes)
      .join('g')
      .call(
        d3
          .drag<SVGGElement, Node>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      )
      .on('click', (event, d) => {
        // setSelectedNodeId(d.id); // Removed unused state
        if (onNodeClick) onNodeClick(d.message);
        event.stopPropagation();
      })
      .on('dblclick', (event, d) => {
        if (onNodeDoubleClick) onNodeDoubleClick(d.message);
        event.stopPropagation();
      });

    // ノードの円（外側の光彩）
    node
      .append('circle')
      .attr('r', (d) => (d.isBranchPoint ? 20 : 12))
      .attr('fill', (d) => {
        if (d.color) return d.color;
        return d.role === 'human' ? '#3b82f6' : '#10b981';
      })
      .attr('fill-opacity', 0.3)
      .attr('filter', 'url(#glow)');

    // ノードの円（実体）
    node
      .append('circle')
      .attr('r', (d) => (d.isBranchPoint ? 12 : 8))
      .attr('fill', (d) => {
        if (d.color) return d.color;
        return d.role === 'human' ? '#3b82f6' : '#10b981';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', (d) => (d.isBranchPoint ? 2 : 1))
      .attr('class', 'transition-all duration-300');

    // ラベル（ホバー時または分岐点のみ表示）
    node
      .append('text')
      .text((d) => truncate(d.content, 20))
      .attr('x', 15)
      .attr('y', 5)
      .attr('font-size', '10px')
      .attr('fill', '#e5e7eb')
      .attr('opacity', (d) => (d.isBranchPoint ? 0.8 : 0)) // デフォルトは隠す
      .attr('class', 'pointer-events-none transition-opacity duration-200');

    // ホバーエフェクト
    node
      .on('mouseover', function (event, d) {
        d3.select(this).select('text').attr('opacity', 1);
        d3.select(this).selectAll('circle').attr('filter', 'url(#glow)');
      })
      .on('mouseout', function (event, d) {
        if (!d.isBranchPoint) {
          d3.select(this).select('text').attr('opacity', 0);
        }
      });

    // シミュレーション更新
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as Node).x!)
        .attr('y1', (d) => (d.source as Node).y!)
        .attr('x2', (d) => (d.target as Node).x!)
        .attr('y2', (d) => (d.target as Node).y!);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data]);

  // フィルタリング・検索・アクティブ更新のハイライト更新
  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    const nodes = svg.selectAll<SVGGElement, Node>('.nodes g');

    nodes.each(function (d) {
      let isMatch = true;

      // 検索フィルタ
      if (searchQuery && !d.content.toLowerCase().includes(searchQuery.toLowerCase())) {
        isMatch = false;
      }

      // タグフィルタ (実装準備)
      if (selectedTags && selectedTags.length > 0) {
        // if (!d.message.tagIds.some(t => selectedTags.includes(t))) isMatch = false;
      }

      const isActive = activeMessageId === d.id;
      const opacity = isMatch ? 1 : 0.1;
      const scale = isActive ? 1.5 : (isMatch ? 1 : 0.8);
      const stroke = isActive ? '#f43f5e' : '#fff'; // Active: Rose-500
      const strokeWidth = isActive ? 3 : (d.isBranchPoint ? 2 : 1);

      d3.select(this)
        .transition()
        .duration(300)
        .style('opacity', opacity)
        .attr('transform', `translate(${d.x},${d.y}) scale(${scale})`);

      d3.select(this).select('circle:nth-of-type(2)')
        .attr('stroke', stroke)
        .attr('stroke-width', strokeWidth);

      // リンクの透過度も調整
      // リンクのロジックは少し複雑なので簡易的に全リンクを薄くする等の対応も可
    });
  }, [searchQuery, selectedTags, data, activeMessageId]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-gray-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800/50 to-gray-900 pointer-events-none" />
      <svg
        ref={svgRef}
        className="w-full h-full cursor-move"
        style={{ filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))' }}
      />
      {/* 操作ヒント */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-500 glass px-2 py-1 rounded">
        Scroll to Zoom • Drag to Move • Double Click to Jump
      </div>
    </div>
  );
}
