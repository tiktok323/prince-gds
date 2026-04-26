let handler = async (m, { conn }) => {
    let q = m.quoted ? m.quoted : null;
    try {
        if (!q) {
            return m.reply('✳️ Reply to a view-once message to get it outside in your *youid number*.');
        }

        let media = await q.download?.();
        if (!media) throw 'Failed to download media!';

        let caption = q.text || '';
        let mime = q.mtype || q.mediaType;
        
        // ✅ SAFE WAY - Use conn.user.jid ke bajaye m.sender use kar
        let userId = m.sender?.split('@')[0] + '@s.whatsapp.net' || '';

        if (/image|video/.test(mime)) {
            await conn.sendFile(userId, media, '', caption, m);
        } else if (/audio/.test(mime)) {
            await conn.sendMessage(userId, { 
                audio: media, 
                mimetype: 'audio/ogg; codecs=opus', 
                ptt: true
            }, { quoted: m });
        } else {
            throw 'Unsupported format! Only images, videos, or audio are allowed.';
        }
    } catch (e) {
        console.error(e);
        m.reply(`✳️ ${e}`);
    }
};

handler.help = ['readvo'];
handler.tags = ['tools'];
handler.command = ['cute', 'wow', 'v', 'youid', 'ye', 'oh', 'acha'];

export default handler;
