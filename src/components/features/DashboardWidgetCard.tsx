import Image from 'next/image'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import { WIDGET_IMAGES, type WidgetImageKey } from '@/lib/widget-images'

type DashboardWidgetCardProps = Readonly<{
  href: string
  title: string
  imageKey?: WidgetImageKey
}>

export default function DashboardWidgetCard({ href, title, imageKey }: DashboardWidgetCardProps) {
  const image = imageKey ? WIDGET_IMAGES[imageKey] : undefined

  return (
    <Link href={href}>
      <Card className="group relative h-64 cursor-pointer overflow-hidden transition-colors hover:bg-neutral-900 md:max-w-none">
        {image && (
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            className="absolute -right-20 top-[15%] h-auto w-[30rem] opacity-60 mix-blend-multiply transition group-hover:mix-blend-hard-light group-hover:grayscale group-hover:brightness-150"
          />
        )}

        <h3 className="relative z-10 text-lg font-medium text-neutral-900 transition-colors group-hover:text-neutral-50">
          {title}
        </h3>
      </Card>
    </Link>
  )
}
