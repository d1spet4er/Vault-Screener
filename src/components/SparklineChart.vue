<template>
  <canvas ref="canvas" :width="width" :height="height" />
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  width: { type: Number, default: 80 },
  height: { type: Number, default: 28 },
  positive: { type: Boolean, default: true },
})

const canvas = ref(null)

function draw() {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx || !props.data.length) return
  const pts = props.data.slice(-20)
  const w = props.width, h = props.height
  ctx.clearRect(0, 0, w, h)
  const min = Math.min(...pts), max = Math.max(...pts)
  const range = max - min || 1
  const color = props.positive ? '#4caf7a' : '#d95c5c'
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, props.positive ? 'rgba(76,175,122,.3)' : 'rgba(217,92,92,.3)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  const px = i => (i / (pts.length - 1)) * w
  const py = v => h - ((v - min) / range) * (h - 4) - 2
  ctx.beginPath()
  ctx.moveTo(px(0), py(pts[0]))
  for (let i = 1; i < pts.length; i++) ctx.lineTo(px(i), py(pts[i]))
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.lineTo(px(pts.length - 1), h)
  ctx.lineTo(0, h)
  ctx.closePath()
  ctx.fillStyle = grad
  ctx.fill()
}

onMounted(draw)
watch(() => [props.data, props.positive], draw)
</script>
