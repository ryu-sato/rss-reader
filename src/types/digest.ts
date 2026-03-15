// ダイジェスト型定義

export interface Digest {
  id: string
  title: string | null
  content: string
  createdAt: Date
}

/** ダイジェスト一覧表示用（content省略） */
export interface DigestListItem {
  id: string
  title: string | null
  createdAt: Date
}

export interface GetDigestsResponse {
  success: true
  data: DigestListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface GetDigestResponse {
  success: true
  data: Digest
}

export interface CreateDigestResponse {
  success: true
  data: Digest
}
