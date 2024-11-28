export const GAME_WIDTH = (window as any).gameWidth || 2000; // eslint-disable-line @typescript-eslint/no-explicit-any
export const GAME_HEIGHT = (window as any).gameHeight || 1000; // eslint-disable-line @typescript-eslint/no-explicit-any
export const ONLY_BANNER = (window as any).onlyBanner || false; // eslint-disable-line @typescript-eslint/no-explicit-any

export const CATEGORY_BARRIERS = 0b0001;
export const CATEGORY_OBJECTS = 0b0010;
export const CATEGORY_CLOTHES = 0b0100;
export const CATEGORY_FOREGROUND = 0b1000;

export const CLOTHING_IN_WARDROBE = "clothing-in-wardrobe";
export const CLOTHING_UNATTACHED = "clothing-unattached";
export const CLOTHING_ATTACHED = "clothing-attached";

export const WARDROBE_OPENING = "wardrobe-opening";
export const WARDROBE_OPEN = "wardrobe-open";
export const WARDROBE_CLOSING = "wardrobe-closing";
export const WARDROBE_CLOSED = "wardrobe-closed";

export const DEPTH_BACKGROUND = -4;
export const DEPTH_CONTAINER = -3;
export const DEPTH_IN_CONTAINER = -2;
export const DEPTH_CONTAINER_DOOR = -1;
export const DEPTH_DEFAULT = 0;
export const DEPTH_FOREGROUND = 1;
export const DEPTH_BANNER = 2;
