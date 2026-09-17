export type ScreenName =
  | 'login'
  | 'home'
  | 'daily_content'
  | 'stories'
  | 'my_contents'
  | 'work_profile'
  | 'profile'
  | 'alpha';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'info' | 'gold';
}

export interface StorySlide {
  id: number;
  title: string;
  tag: string;
  whatToShow: string;
  whatToSay: string;
  onScreenText?: string;
  interactionQuestion?: string;
  interactionType?: 'poll';
  pollOptions?: [string, string];
  pollVotes?: [number, number];
}

export interface GenerationRequest {
  topic: string;
  goal?: string;
  formats?: string[];
  executionStyle?: string[];
}

export interface GeneratedStory {
  title: string;
  whatToShow: string;
  whatToSay: string;
  onScreenText?: string;
}

export interface GeneratedContent {
  id: string;
  title: string;
  objective: string;
  stories: GeneratedStory[];
  reel: {
    hook: string;
    script: string;
    cta: string;
  };
  carousel: string[];
  createdAt: string;
  source: 'local' | 'gemini';
}
