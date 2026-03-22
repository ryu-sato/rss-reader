export const dynamic = 'force-dynamic'

import { getAllPreferences } from '@/lib/preference-service'
import PreferencesClient from './preferences-client'

export default async function PreferencesPage() {
  const preferences = await getAllPreferences()

  return (
    <div className="h-full overflow-y-auto">
      <div className="h-11 border-b border-border flex items-center px-4 sticky top-0 bg-background/95 backdrop-blur z-10">
        <span className="text-xs text-muted-foreground">
          {preferences.length === 0 ? '好みなし' : `${preferences.length} 件`}
        </span>
      </div>
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-foreground">お好みの設定</h1>
          <p className="text-sm text-muted-foreground mt-1">
            お好みのテキストを登録すると、記事のスコアリングに使用されます。
          </p>
        </div>
        <PreferencesClient initialPreferences={preferences} />
      </div>
    </div>
  )
}
