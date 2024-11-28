// Assistant-related types
export interface IPlan {
  _thinking: string;
  plan: {
    tool: string;
    query: string;
  }[];
}

export interface IAssistantTools {
  name: string;
  description: string;
}

// Audio-related types
export interface AudioMetadata {
  duration: number;
  sampleRate: number;
  channels: number;
  bitRate: number;
  codec: string;
  format: string;
}

export interface AudioLoudnessData {
  time: number;
  loudness: number;
}

export interface SilenceInterval {
  start: number;
  end: number;
  duration: number;
}

export interface AudioChunk {
  start: number;
  end: number;
}

export interface NonSilentInterval {
  start: number;
  end: number;
  duration: number;
}

// Web search and content types
export type AllowedDomain = {
  name: string;
  url: string;
  scrappable: boolean;
};

export type Query = {
  q: string;
  url: string;
};

export type SearchResult = {
  query: string;
  domain: string;
  results: {
    url: string;
    title: string;
    description: string;
  }[];
};

export type WebContent = {
  url: string;
  content: string;
};

// Image processing type
export interface ImageProcessingResult {
  description: string;
  source: string;
}

// Document-related types
export interface IDoc {
  text: string;
  metadata: {
    tokens: number;
    type: 'audio' | 'text' | 'image' | 'document';
    content_type: 'chunk' | 'complete';
    source?: string;
    mimeType?: string;
    name?: string;
    description?: string;
    source_uuid?: string;
    conversation_uuid?: string;
    uuid?: string;
    duration?: number;
    headers?: Headers;
    urls?: string[];
    images?: string[];
    screenshots?: string[];
    chunk_index?: number;
    total_chunks?: number;
  };
}

export interface Headers {
  [key: string]: string[];
}