export const LinkReference = {
  comfyUI: 'https://www.comfy.org/',
  github: 'https://github.com/beclab/Olares',
  discord: 'https://discord.com/invite/BzfqrgQPDK',
  twitter: 'https://x.com/Olares_OS',
  medium: 'https://olares.medium.com/',
  olares: 'https://olares.cn/',
};

export interface SupportIconProps {
  icon: string;
  active: string;
  link: string;
}

export interface SupportIconWithLabel {
  icon: string;
  label: string;
  link: string;
}

export interface SupportIconWithQRProps {
  icon: string;
  active: string;
  qrIcon: string;
}

export const weChatIcon: SupportIconWithQRProps = {
  icon: 'support/wechat-circle.svg',
  active: 'support/wechat-circle2.svg',
  qrIcon: 'support/wechatQR.jpeg',
};

export const comfyUIIcon: SupportIconWithLabel = {
  icon: 'support/comfyui.svg',
  label: 'ComfyOrg',
  link: LinkReference.comfyUI,
};

export const discordIcon: SupportIconWithLabel = {
  icon: 'support/discord.svg',
  label: 'Discord',
  link: LinkReference.discord,
};

export const olaresIcon: SupportIconProps = {
  icon: 'support/olares-circle.svg',
  active: 'support/olares-circle2.svg',
  link: LinkReference.olares,
};

export const githubIcon: SupportIconProps = {
  icon: 'support/github-circle.svg',
  active: 'support/github-circle2.svg',
  link: LinkReference.github,
};

export const mediumIcon: SupportIconProps = {
  icon: 'support/medium-circle.svg',
  active: 'support/medium-circle2.svg',
  link: LinkReference.medium,
};
