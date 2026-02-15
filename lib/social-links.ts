import {
  SiYoutube,
  SiTiktok,
  SiLinkedin,
  SiX,
  SiInstagram,
  SiFacebook,
  SiDiscord,
  SiGithub,
  SiMedium,
  SiReddit,
  SiThreads,
  SiBluesky,
} from "react-icons/si";
import type { IconType } from "react-icons";

export interface SocialLink {
  label: string;
  href: string;
  icon: IconType;
  testId: string;
  purpose: string;
}

export const socialLinks: SocialLink[] = [
  { label: "YouTube", href: "https://youtube.com/@gorigo", icon: SiYoutube, testId: "link-social-youtube", purpose: "Demos, tutorials, and customer success stories" },
  { label: "TikTok", href: "https://tiktok.com/@gorigo.ai", icon: SiTiktok, testId: "link-social-tiktok", purpose: "Quick AI demos and behind-the-scenes content" },
  { label: "LinkedIn", href: "https://linkedin.com/company/gorigo", icon: SiLinkedin, testId: "link-social-linkedin", purpose: "Industry insights and company updates" },
  { label: "X", href: "https://x.com/gorigo_ai", icon: SiX, testId: "link-social-x", purpose: "Real-time news, product launches, and tech commentary" },
  { label: "Instagram", href: "https://instagram.com/gorigo.ai", icon: SiInstagram, testId: "link-social-instagram", purpose: "Brand stories, team culture, and visual updates" },
  { label: "Facebook", href: "https://facebook.com/gorigoai", icon: SiFacebook, testId: "link-social-facebook", purpose: "Community discussions and event announcements" },
  { label: "Discord", href: "https://discord.gg/gorigo", icon: SiDiscord, testId: "link-social-discord", purpose: "Join our community for real-time support and feedback" },
  { label: "GitHub", href: "https://github.com/gorigo", icon: SiGithub, testId: "link-social-github", purpose: "Open-source tools, API resources, and developer docs" },
  { label: "Medium", href: "https://medium.com/@gorigo", icon: SiMedium, testId: "link-social-medium", purpose: "In-depth articles on AI, call centres, and automation" },
  { label: "Reddit", href: "https://reddit.com/r/gorigo", icon: SiReddit, testId: "link-social-reddit", purpose: "Community discussions and Q&A" },
  { label: "Threads", href: "https://threads.net/@gorigo.ai", icon: SiThreads, testId: "link-social-threads", purpose: "Casual updates and quick takes on the industry" },
  { label: "Bluesky", href: "https://bsky.app/profile/gorigo.ai", icon: SiBluesky, testId: "link-social-bluesky", purpose: "Early-adopter tech community and open conversations" },
];
