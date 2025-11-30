import { StickerPack } from './types';

// The default pack with Traditional Chinese memes as requested
export const DEFAULT_STICKER_PACK: StickerPack = {
  name: "Default Taiwan Pack",
  prompts: [
    { id: 'sticker_happy', base: 'a happy, joyful, smiling expression, maybe with stars in the eyes', memeText: '好耶！' }, 
    { id: 'sticker_sad', base: 'a sad expression, with cartoonishly large tears streaming down the face', memeText: '寶寶心裡苦' }, 
    { id: 'sticker_laugh', base: 'laughing out loud hysterically, eyes squeezed shut', memeText: '笑死' }, 
    { id: 'sticker_angry', base: 'an angry, fuming expression with red cheeks and steam coming out of the ears', memeText: '氣氣氣' }, 
    { id: 'sticker_love', base: 'an adoring expression with large heart-shaped eyes', memeText: '愛你喔' }, 
    { id: 'sticker_ok', base: 'giving a cheerful thumbs-up sign', memeText: '收到！' }, 
    { id: 'sticker_confused', base: 'a confused expression with question marks floating around the head', memeText: '蛤？' }, 
    { id: 'sticker_sleepy', base: 'a very sleepy, yawning expression with a snot bubble', memeText: '想睡...' }, 
    { id: 'sticker_surprised', base: 'a shocked, surprised expression with wide eyes and open mouth', memeText: '真假？！' }, 
    { id: 'sticker_thinking', base: 'a thoughtful expression with a finger on the chin', memeText: '我想想' }, 
    { id: 'sticker_crying', base: 'a crying expression with a quivering lip', memeText: '嗚嗚嗚' }, 
    { id: 'sticker_pleading', base: 'a pleading expression with big, shimmering "puppy dog" eyes', memeText: '拜託啦' },
  ]
};

export const MODEL_IMAGE = 'gemini-3-pro-image-preview';
export const MODEL_TEXT = 'gemini-2.5-flash';
