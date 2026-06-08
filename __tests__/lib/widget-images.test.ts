import { describe, expect, it } from 'vitest'
import { WIDGET_IMAGES } from '@/lib/widget-images'

describe('WIDGET_IMAGES', () => {
  it('maps "tasks" to /img/cat.png with empty alt and 500x500 dimensions', () => {
    expect(WIDGET_IMAGES.tasks).toEqual({
      src: '/img/cat.png',
      alt: '',
      width: 500,
      height: 500,
    })
  })

  it('maps "notes" to /img/butterfly.png with empty alt and 350x350 dimensions', () => {
    expect(WIDGET_IMAGES.notes).toEqual({
      src: '/img/butterfly.png',
      alt: '',
      width: 350,
      height: 350,
    })
  })

  it('exposes a non-empty set of widget keys', () => {
    const keys = Object.keys(WIDGET_IMAGES)

    expect(keys.length).toBeGreaterThan(0)
    keys.forEach((key) => {
      expect(typeof key).toBe('string')
      expect(key.length).toBeGreaterThan(0)
    })
  })
})
