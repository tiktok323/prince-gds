import { generateWAMessageFromContent } from '@whiskeysockets/baileys';

const handler = async (m, { conn, text }) => {
  if (!m.quoted) throw 'Reply to image/video';

  // 🔥 preserve line breaks
  const newCaption = (text || '*Prince Dastageer*')
    .replace(/\r?\n/g, '\n\n');

  let quotedMsg = m.quoted.fakeObj.message;

  if (quotedMsg.imageMessage) {
    quotedMsg.imageMessage.caption = newCaption;
  } else if (quotedMsg.videoMessage) {
    quotedMsg.videoMessage.caption = newCaption;
  } else {
    throw 'Only image/video supported';
  }

  const msg = generateWAMessageFromContent(
    m.chat,
    quotedMsg,
    { userJid: conn.user.id }
  );

  await conn.relayMessage(m.chat, msg.message, {
    messageId: msg.key.id
  });
};

handler.command = /^(caption|cap|cp)$/i;
export default handler;
