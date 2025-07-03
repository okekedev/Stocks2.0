import React, { useEffect, useRef } from 'react';

export function StockChart({ data, height = 200, showNewsLine = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!data || !data.data || data.data.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height: canvasHeight } = canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, canvasHeight);
    
    const chartData = data.data;
    const newsTime = data.newsTime ? new Date(data.newsTime).getTime() : null;
    
    // Calculate bounds
    const prices = chartData.map(d => [d.open, d.high, d.low, d.close]).flat();
    const volumes = chartData.map(d => d.volume);
    const times = chartData.map(d => d.timestamp);
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const maxVolume = Math.max(...volumes);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    const priceRange = maxPrice - minPrice || 1;
    const timeRange = maxTime - minTime || 1;
    
    // Chart dimensions (simpler layout)
    const margin = { top: 20, right: 50, bottom: 30, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const priceChartHeight = (canvasHeight - margin.top - margin.bottom) * 0.75;
    const volumeChartHeight = (canvasHeight - margin.top - margin.bottom) * 0.25;
    
    // Helper functions
    const xScale = (time) => margin.left + ((time - minTime) / timeRange) * chartWidth;
    const priceScale = (price) => margin.top + (1 - (price - minPrice) / priceRange) * priceChartHeight;
    const volumeScale = (volume) => margin.top + priceChartHeight + (1 - volume / maxVolume) * volumeChartHeight;
    
    // Draw simple grid
    ctx.strokeStyle = 'rgba(75, 85, 99, 0.2)';
    ctx.lineWidth = 0.5;
    
    // Horizontal price lines
    for (let i = 0; i <= 3; i++) {
      const price = minPrice + (priceRange / 3) * i;
      const y = priceScale(price);
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();
      
      // Price labels
      ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(price.toFixed(2), margin.left - 5, y + 3);
    }

    // Simple volume bars
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    chartData.forEach((d) => {
      const x = xScale(d.timestamp);
      const barHeight = Math.max(1, volumeChartHeight * (d.volume / maxVolume));
      const y = margin.top + priceChartHeight + volumeChartHeight - barHeight;
      ctx.fillRect(x - 1, y, 2, barHeight);
    });

    // Simple price line (close prices)
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    chartData.forEach((d, i) => {
      const x = xScale(d.timestamp);
      const y = priceScale(d.close);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // News event line (if applicable)
    if (showNewsLine && newsTime && newsTime >= minTime && newsTime <= maxTime) {
      const newsX = xScale(newsTime);
      
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(newsX, margin.top);
      ctx.lineTo(newsX, margin.top + priceChartHeight);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // News label
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📰', newsX, margin.top - 5);
    }

    // Current price dot
    if (chartData.length > 0) {
      const lastData = chartData[chartData.length - 1];
      const lastX = xScale(lastData.timestamp);
      const lastY = priceScale(lastData.close);
      
      ctx.beginPath();
      ctx.arc(lastX, lastY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#06B6D4';
      ctx.fill();
      
      // Current price label
      ctx.fillStyle = '#06B6D4';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${lastData.close.toFixed(2)}`, lastX + 5, lastY - 5);
    }

    // Simple title
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${data.ticker}`, margin.left, 15);
    
    // Price change
    if (data.summary && data.summary.priceMove !== undefined) {
      const priceMove = data.summary.priceMove;
      ctx.fillStyle = priceMove >= 0 ? '#10B981' : '#EF4444';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(
        `${priceMove >= 0 ? '+' : ''}${priceMove.toFixed(2)}%`, 
        width - margin.right, 
        15
      );
    }

  }, [data, height, showNewsLine]);

  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-gray-800 rounded" style={{ height }}>
        <div className="text-gray-400 text-sm">No chart data</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={400}
        height={height}
        className="border border-gray-600 rounded bg-gray-800"
        style={{ width: '100%', maxWidth: '400px' }}
      />
      
      {/* Simple legend */}
      <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-0.5 bg-green-400"></div>
            <span>Price</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-400 opacity-30"></div>
            <span>Vol</span>
          </div>
        </div>
        <div>{data.data.length} mins</div>
      </div>
    </div>
  );
}