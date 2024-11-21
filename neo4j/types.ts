export enum DocumentType {
  Application = "application",
  Device = "device",
  Book = "book",
  Course = "course",
  Movie = "movie",
  Video = "video",
  Image = "image",
  Blog = "blog",
  Music = "music",
  Article = "article",
  Channel = "channel",
  Document = "document",
  Note = "note",
}

export interface Document {
  uuid: string;
  name: string;
  description: string;
  content: string;
  url: string;
  images: string[];
  type: DocumentType;
  tags: string[];
  embedding: number[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  node: {
    id: string;
    name: string;
    url: string;
    description: string;
    content: string;
  };
}

export interface RecallJson {
  specific?: {
    q: string;
    types: DocumentType[];
  };
  relation?: {
    q: string;
    types: DocumentType[];
    relatedTypes: DocumentType[];
  };
  general?: {
    type: DocumentType;
  };
}
