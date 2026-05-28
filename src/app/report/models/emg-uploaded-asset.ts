export type EmgUploadedAssetKind = 'image' | 'pdf';

export interface EmgUploadedAsset {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  kind: EmgUploadedAssetKind;
  dataUrl?: string;
  base64?: string;
}
