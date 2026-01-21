import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ThoughtForkData } from '../../shared/types';

interface Props {
  data: ThoughtForkData | null;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  role: 'human' | 'assistant';
  content: string;
  color: string | null;
  isBranchPoint: boolean;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string;
  target: string;
}

export function NetworkView({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // ノードとリンクを構築
    const nodes: Node[] = data.messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.contentPreview,
      color: m.color,
      isBranchPoint: m.isBranchPoint
    }));

    const links: Link[] = data.messages
      .filter(m => m.parentId)
      .map(m => ({
        source: m.parentId!,
        target: m.id
      }));

    // シミュレーション
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // ズーム
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    const g = svg.append('g');

    // リンク描画
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#4b5563')
      .attr('stroke-width', 2);

    // ノード描画
    const node = g.append('g')
      .selectAll<SVGCircleElement, Node>('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => d.isBranchPoint ? 15 : 10)
      .attr('fill', d => d.color || (d.role === 'human' ? '#3b82f6' : '#10b981'))
      .attr('stroke', d => d.isBranchPoint ? '#fbbf24' : 'none')
      .attr('stroke-width', d => d.isBranchPoint ? 3 : 0)
      .call(d3.drag<SVGCircleElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

    // ツールチップ
    node.append('title')
      .text(d => d.content);

    // シミュレーション更新
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);

      node
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!);
    });

    function dragstarted(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data]);

  return (
    <div className="w-full h-full">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ background: '#111827' }}
      />
    </div>
  );
}
