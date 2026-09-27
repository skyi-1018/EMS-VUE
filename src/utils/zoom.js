export function getElementRect(el) {
  if (!el) return null
  if (el.$el && el.$el.getBoundingClientRect) {
    const rect = el.$el.getBoundingClientRect()
    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
  }
  if (el.getBoundingClientRect) {
    const rect = el.getBoundingClientRect()
    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
  }
  return null
}

export function rectFromRef(refObj) {
  const el = refObj && refObj.value
  if (!el) return null
  return getElementRect(el)
}

export function defaultRect(width = 240, height = 120) {
  return {
    x: (window.innerWidth - width) / 2,
    y: (window.innerHeight - height) / 2,
    width,
    height
  }
}

export function rectFromEvent(event, fallbackWidth = 200, fallbackHeight = 100) {
  if (event && event.currentTarget && event.currentTarget.getBoundingClientRect) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
  }
  if (event && event.target && event.target.getBoundingClientRect) {
    const rect = event.target.getBoundingClientRect()
    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
  }
  return defaultRect(fallbackWidth, fallbackHeight)
}

