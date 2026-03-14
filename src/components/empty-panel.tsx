import { Rss } from 'lucide-react'

export function EmptyPanel() {
  return (
    <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/30">
      <div className="text-center">
        <Rss className="h-10 w-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm">記事を選択してください</p>
      </div>
    </div>
  )
}
