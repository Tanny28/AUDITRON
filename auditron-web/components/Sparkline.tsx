'use client'

import { useEffect, useRef } from 'react'

interface SparklineProps {
    data: number[]
    width?: number
    height?: number
    color?: string
}

export function Sparkline({
    data,
    width = 100,
    height = 30,
    color = '#d4b861',
}: SparklineProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || data.length === 0) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Clear canvas
        ctx.clearRect(0, 0, width, height)

        // Calculate dimensions
        const padding = 2
        const chartWidth = width - padding * 2
        const chartHeight = height - padding * 2

        // Find min/max for scaling
        const min = Math.min(...data)
        const max = Math.max(...data)
        const range = max - min || 1

        // Calculate points
        const points = data.map((value, index) => {
            const x = padding + (index / (data.length - 1)) * chartWidth
            const y = padding + chartHeight - ((value - min) / range) * chartHeight
            return { x, y }
        })

        // Draw line
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'

        points.forEach((point, index) => {
            if (index === 0) {
                ctx.moveTo(point.x, point.y)
            } else {
                ctx.lineTo(point.x, point.y)
            }
        })

        ctx.stroke()

        // Optional: Fill area under line
        ctx.lineTo(points[points.length - 1].x, height - padding)
        ctx.lineTo(padding, height - padding)
        ctx.closePath()
        ctx.fillStyle = `${color}20` // 20% opacity
        ctx.fill()
    }, [data, width, height, color])

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="inline-block"
            aria-label="Trend sparkline"
        />
    )
}
