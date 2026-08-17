/**
 * タグ管理機能の型定義。
 *
 * Tag は Entry を分類するための支援ドメインの概念。Entry 側から辿る関連の型
 * （TagOnEntry）はコアドメイン（@/domain/entry/entry）が持つ。
 */

import type { Tag as TagModel } from '@/generated/prisma/client'

export type Tag = TagModel

/** タグとその使用回数（付与されているエントリー数） */
export type TagWithCount = Tag & { entryCount: number }

// ========================================
// APIリクエスト/レスポンス
// ========================================

export interface CreateTagRequest {
  name: string
  entryId: string
}

export interface CreateTagResponse {
  success: true
  data: Tag
}

export interface GetTagsResponse {
  success: true
  data: TagWithCount[]
}
