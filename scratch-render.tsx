import { renderToStaticMarkup } from 'react-dom/server'
import PreferencesClient from './src/app/preferences/preferences-client'

const html = renderToStaticMarkup(
  <PreferencesClient
    initialPreferences={[
      { id: '1', text: 'テクノロジーとAIに関する記事が好きです', name: 'テクノロジーとAIに関する記事が好き…', createdAt: new Date(), updatedAt: new Date() },
      { id: '2', text: 'スポーツニュース', name: 'スポーツニュース', createdAt: new Date(), updatedAt: new Date() },
    ]}
    initialScoreThreshold={0.5}
  />
)

console.log(html)
