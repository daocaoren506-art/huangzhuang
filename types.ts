export interface HistoryItem {
  id: string;
  faceUrl: string;
  clothUrl: string;
  resultUrl: string;
  timestamp: number;
  category?: SubjectCategory;
  itemType?: ItemType;
}

export interface ImageAsset {
  id: string;
  url: string;
  isUserUploaded?: boolean;
  category?: SubjectCategory;
}

export enum AppStep {
  SELECT_FACE = 1,
  SELECT_CLOTHES = 2,
  GENERATE_RESULT = 3
}

export enum SubjectCategory {
  PERSON = 'person',
  ANIMAL = 'animal',
  OBJECT = 'object'
}

export type ItemType = 'clothing' | 'accessory';

export const CATEGORY_LABELS: Record<SubjectCategory, string> = {
  [SubjectCategory.PERSON]: '人物',
  [SubjectCategory.ANIMAL]: '动物',
  [SubjectCategory.OBJECT]: '物品'
};