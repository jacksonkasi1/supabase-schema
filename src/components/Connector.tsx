'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useDark } from '@/lib/hooks';

interface ConnectorProps {
  svg: string;
  id: string;
  target: string;
}

export function Connector({ svg, id, target }: ConnectorProps) {
  const { tables, tableHighlighted } = useStore();
  const pathRef = useRef<SVGPathElement>(null);
  const [isHover, setIsHover] = useState(false);
  const [fkPos, setFkPos] = useState({ x: 0, y: 0 });
  const { isDark } = useDark();

  const tableName = useMemo(() => id.split('.')[0], [id]);
  const tableTargetName = useMemo(() => target.split('.')[0], [target]);

  const positionStart = useMemo(() => {
    if (tables[tableName]) {
      return tables[tableName].position || { x: 0, y: 0 };
    }
    return { x: 0, y: 0 };
  }, [tables, tableName]);

  const positionEnd = useMemo(() => {
    if (tables[tableTargetName]) {
      return tables[tableTargetName].position || { x: 0, y: 0 };
    }
    return { x: 0, y: 0 };
  }, [tables, tableTargetName]);

  const drawSVG = () => {
    if (!pathRef.current) return;

    const svgElem = document.getElementById(svg) as HTMLElement;
    const startElem = document.getElementById(id) as HTMLElement;
    const endElem = document.getElementById(target) as HTMLElement;

    if (!svgElem || !startElem || !endElem) return;

    const startTop = startElem.offsetTop;
    const startHeight = startElem.offsetHeight;
    const startLeft = startElem.offsetLeft;
    const startRight = startElem.offsetWidth;

    const endTop = endElem.offsetTop;
    const endHeight = endElem.offsetHeight;
    const endLeft = endElem.offsetLeft;
    const endRight = endElem.offsetWidth;

    const posStartY = positionStart.y + startTop + startHeight / 2;
    const posEndY = positionEnd.y + endTop + endHeight / 2;
    const posDiffY = posEndY - posStartY;
    const posSvgY = posDiffY > 0 ? posStartY : posEndY;

    let posStartX = positionStart.x + startLeft;
    let posEndX = positionEnd.x + endLeft;
    let posDiffX = posEndX - posStartX;
    let posSvgX = posDiffX > 0 ? posStartX : posEndX;

    if (
      posDiffX + endRight > 0 &&
      posDiffX + endRight < startRight + endRight
    ) {
      // draw
      posStartX = positionStart.x + startRight;
      posEndX = positionEnd.x + endRight;
      posDiffX = posEndX - posStartX;
      posDiffX < 0 ? (posSvgX = posEndX) : (posSvgX = posStartX);

      pathRef.current.setAttribute(
        'd',
        `M ${Math.abs(posStartX - posSvgX)} ${
          posDiffY > 0 ? 10 : Math.abs(posDiffY - 10)
        } H ${Math.abs(posDiffX) + 30} V ${
          posDiffY > 0 ? Math.abs(posDiffY) + 10 : 10
        } H ${Math.abs(posEndX - posSvgX)}`
      );
    } else if (posDiffX > 0) {
      posStartX = positionStart.x + startRight;
      posEndX = endLeft + positionEnd.x;
      posDiffX = posEndX - posStartX;
      posSvgX = posStartX;

      pathRef.current.setAttribute(
        'd',
        `M ${Math.abs(posStartX - posSvgX)} ${
          posDiffY > 0 ? 10 : Math.abs(posDiffY - 10)
        } H ${Math.abs(posStartX - posSvgX + posDiffX / 2)} V ${
          posDiffY > 0 ? Math.abs(posDiffY) + 10 : 10
        } H ${Math.abs(posEndX - posSvgX)}`
      );
    } else {
      posStartX = positionStart.x + startLeft;
      posEndX = endRight + positionEnd.x;
      posDiffX = posEndX - posStartX;
      posSvgX = posEndX;
      pathRef.current.setAttribute(
        'd',
        `M ${Math.abs(posStartX - posSvgX)} ${
          posDiffY > 0 ? 10 : Math.abs(posDiffY - 10)
        } H ${Math.abs(posStartX - posSvgX + posDiffX / 2)} V ${
          posDiffY > 0 ? Math.abs(posDiffY) + 10 : 10
        } H ${Math.abs(posEndX - posSvgX)}`
      );
    }

    svgElem.style.left = posSvgX + 'px';
    svgElem.style.top = posSvgY - 10 + 'px';
    svgElem.setAttribute('width', `${Math.abs(posDiffX) + 40}`);
    svgElem.setAttribute('height', `${Math.abs(posDiffY) + 20}`);

    setFkPos({
      x: posEndX - posSvgX + 2,
      y: posEndY - posSvgY + 10,
    });
  };

  useEffect(() => {
    drawSVG();
  }, [positionStart, positionEnd]);

  useEffect(() => {
    if (!tableHighlighted) {
      setIsHover(false);
    } else if (tableName === tableHighlighted || tableTargetName === tableHighlighted) {
      setIsHover(true);
    }
  }, [tableHighlighted, tableName, tableTargetName]);

  const computedStrokeColor = useMemo(() => {
    if (isHover) {
      return 'rgb(16, 185, 129)';
    } else {
      if (isDark) {
        return 'rgba(255,255,255,0.5)';
      } else {
        return 'rgba(214, 211, 209, 0.5)';
      }
    }
  }, [isHover, isDark]);

  return (
    <svg
      className="absolute z-10"
      id={svg}
      width="0"
      height="0"
      pointerEvents="none"
    >
      <path
        ref={pathRef}
        className="fill-transparent"
        stroke={computedStrokeColor}
        pointerEvents="visibleStroke"
        style={{ strokeWidth: '3px' }}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
      />
      <circle
        cx={fkPos.x}
        cy={fkPos.y}
        r="7"
        className="text-warm-gray-400 dark:text-white fill-current"
      >
        fk
      </circle>
    </svg>
  );
}
