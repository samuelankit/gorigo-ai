import type { ConnectorSegment } from "@shared/schema";

export interface SocialConnectorConfig {
  type: string;
  name: string;
  description: string;
  segment: ConnectorSegment;
  authType: "oauth" | "api_key" | "none";
  icon: string;
  available: boolean;
  oauthScopes?: string[];
  platformLimits?: {
    maxPostsPerDay?: number;
    maxCharacters?: number;
    mediaRequired?: boolean;
    videoOnly?: boolean;
  };
}

export const SOCIAL_CONNECTOR_REGISTRY: Record<string, SocialConnectorConfig> = {
  facebook_instagram: {
    type: "facebook_instagram",
    name: "Facebook / Instagram",
    description: "Publish posts, stories, and reels to Facebook and Instagram",
    segment: "social",
    authType: "oauth",
    icon: "facebook",
    available: true,
    oauthScopes: ["pages_manage_posts", "instagram_basic", "instagram_content_publish"],
    platformLimits: { maxPostsPerDay: 25, maxCharacters: 2200 },
  },
  linkedin: {
    type: "linkedin",
    name: "LinkedIn",
    description: "Share posts and articles on LinkedIn profiles and company pages",
    segment: "social",
    authType: "oauth",
    icon: "linkedin",
    available: true,
    oauthScopes: ["w_member_social", "r_liteprofile"],
    platformLimits: { maxPostsPerDay: 100, maxCharacters: 3000 },
  },
  twitter: {
    type: "twitter",
    name: "X (Twitter)",
    description: "Post tweets and threads on X",
    segment: "social",
    authType: "oauth",
    icon: "twitter",
    available: true,
    oauthScopes: ["tweet.write", "tweet.read", "users.read"],
    platformLimits: { maxPostsPerDay: 50, maxCharacters: 280 },
  },
  tiktok: {
    type: "tiktok",
    name: "TikTok",
    description: "Upload and publish videos to TikTok",
    segment: "social",
    authType: "oauth",
    icon: "tiktok",
    available: true,
    oauthScopes: ["video.upload", "video.publish"],
    platformLimits: { maxPostsPerDay: 10, videoOnly: true, maxCharacters: 2200 },
  },
  youtube: {
    type: "youtube",
    name: "YouTube",
    description: "Upload videos and manage your YouTube channel",
    segment: "social",
    authType: "oauth",
    icon: "youtube",
    available: true,
    oauthScopes: ["https://www.googleapis.com/auth/youtube.upload"],
    platformLimits: { maxPostsPerDay: 6, videoOnly: true, maxCharacters: 5000 },
  },
  canva: {
    type: "canva",
    name: "Canva",
    description: "Connect your Canva account to import designs and graphics",
    segment: "design",
    authType: "oauth",
    icon: "canva",
    available: true,
  },
  figma: {
    type: "figma",
    name: "Figma",
    description: "Import design assets from your Figma projects",
    segment: "design",
    authType: "oauth",
    icon: "figma",
    available: false,
  },
  adobe_creative: {
    type: "adobe_creative",
    name: "Adobe Creative Cloud",
    description: "Pull assets from Photoshop, Illustrator, and other Adobe apps",
    segment: "design",
    authType: "oauth",
    icon: "adobe",
    available: false,
  },
  creatopy: {
    type: "creatopy",
    name: "Creatopy",
    description: "Import banner ads and animated creatives",
    segment: "design",
    authType: "oauth",
    icon: "creatopy",
    available: false,
  },
  snappa: {
    type: "snappa",
    name: "Snappa",
    description: "Quick social media graphics and banners",
    segment: "design",
    authType: "oauth",
    icon: "snappa",
    available: false,
  },
  visme: {
    type: "visme",
    name: "Visme",
    description: "Infographics, presentations, and visual content",
    segment: "design",
    authType: "oauth",
    icon: "visme",
    available: false,
  },
  capcut: {
    type: "capcut",
    name: "CapCut",
    description: "Short-form video editing for TikTok and Reels",
    segment: "video",
    authType: "oauth",
    icon: "capcut",
    available: true,
  },
  invideo: {
    type: "invideo",
    name: "InVideo",
    description: "Marketing and promotional video templates",
    segment: "video",
    authType: "oauth",
    icon: "invideo",
    available: false,
  },
  lumen5: {
    type: "lumen5",
    name: "Lumen5",
    description: "Turn blog posts and text into engaging videos",
    segment: "video",
    authType: "oauth",
    icon: "lumen5",
    available: false,
  },
  descript: {
    type: "descript",
    name: "Descript",
    description: "Video editing with transcription and screen recording",
    segment: "video",
    authType: "oauth",
    icon: "descript",
    available: false,
  },
  animoto: {
    type: "animoto",
    name: "Animoto",
    description: "Slideshow and promotional video maker",
    segment: "video",
    authType: "oauth",
    icon: "animoto",
    available: false,
  },
  synthesia: {
    type: "synthesia",
    name: "Synthesia",
    description: "AI talking-head videos with virtual presenters",
    segment: "video",
    authType: "oauth",
    icon: "synthesia",
    available: false,
  },
  mailchimp: {
    type: "mailchimp",
    name: "Mailchimp",
    description: "Email marketing campaigns and audience management",
    segment: "marketing",
    authType: "oauth",
    icon: "mailchimp",
    available: false,
  },
  buffer: {
    type: "buffer",
    name: "Buffer",
    description: "Social media scheduling and publishing",
    segment: "marketing",
    authType: "oauth",
    icon: "buffer",
    available: false,
  },
  hootsuite: {
    type: "hootsuite",
    name: "Hootsuite",
    description: "Social media management and monitoring",
    segment: "marketing",
    authType: "oauth",
    icon: "hootsuite",
    available: false,
  },
};

export const CONNECTOR_SEGMENTS = {
  social: {
    label: "Social Platforms",
    description: "Where your posts and videos go",
    order: 1,
  },
  design: {
    label: "Design & Graphics",
    description: "Where you create pictures and banners",
    order: 2,
  },
  video: {
    label: "Video Creation",
    description: "Where you create and edit videos",
    order: 3,
  },
  marketing: {
    label: "Marketing & Distribution",
    description: "Email campaigns and social scheduling",
    order: 4,
  },
} as const;

export const SOCIAL_TIER_LIMITS = {
  individual: {
    maxSocialAccounts: 3,
    maxDesignVideoTools: 2,
    maxStrategiesPerMonth: 5,
    maxScheduledPostsPerMonth: 50,
    analyticsRetentionDays: 30,
  },
  team: {
    maxSocialAccounts: 15,
    maxDesignVideoTools: 10,
    maxStrategiesPerMonth: -1,
    maxScheduledPostsPerMonth: 500,
    analyticsRetentionDays: 90,
  },
  custom: {
    maxSocialAccounts: -1,
    maxDesignVideoTools: -1,
    maxStrategiesPerMonth: -1,
    maxScheduledPostsPerMonth: -1,
    analyticsRetentionDays: 365,
  },
} as const;

export type SocialTierKey = keyof typeof SOCIAL_TIER_LIMITS;

export function getSocialTierLimits(deploymentModel: string) {
  const key = deploymentModel as SocialTierKey;
  return SOCIAL_TIER_LIMITS[key] || SOCIAL_TIER_LIMITS.individual;
}

export function getConnectorsBySegment(segment: string) {
  return Object.values(SOCIAL_CONNECTOR_REGISTRY).filter(c => c.segment === segment);
}

export function getPlatformLimits(connectorType: string) {
  const config = SOCIAL_CONNECTOR_REGISTRY[connectorType];
  return config?.platformLimits || null;
}
