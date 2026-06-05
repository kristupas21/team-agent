export type WidgetImageEntry = Readonly<{
  src: string
  alt: string
  width: number
  height: number
}>

export const WIDGET_IMAGES = {
  tasks: { src: '/img/cat.png', alt: '', width: 500, height: 500 },
} as const satisfies Readonly<Record<string, WidgetImageEntry>>

export type WidgetImageKey = keyof typeof WIDGET_IMAGES
