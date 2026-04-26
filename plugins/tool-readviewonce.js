let handler = async (m, { conn }) => {
    let q = m.quoted ? m.quoted : null; // Check if a message is quoted
    try {
        if (!q) {
            // If no quoted message, reply with a prompt
            return m.reply('✳️ Reply to a view-once message to get it outside.');
        }

        let media = await q.download?.();
        if (!media) throw 'Failed to download media!';

        let caption = q.text || '';
        let mime = q.mtype || q.mediaType; // Detect media type

        if (/image|video/.test(mime)) {
            // Handle images and videos
            await conn.sendFile(m.chat, media, '', caption, m);
        } else if (/audio/.test(mime)) {
            // Send audio as a voice note
            await conn.sendMessage(m.chat, { 
                audio: media, 
                mimetype: 'audio/ogg; codecs=opus', 
                ptt: true // Send as voice note
            }, { quoted: m });
        } else {
            throw 'Unsupported format! Only images, videos, or audio are allowed.';
        }
    } catch (e) {
        console.error(e); // Log the error for debugging
        m.reply(`✳️ ${e}`);
    }
};

handler.help = ['readvo'];
handler.tags = ['tools'];
handler.command = ['readviewonce', 'read', 'vv', 'readvo'];

export default handler;
