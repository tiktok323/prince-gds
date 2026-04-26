import { generateWAMessageFromContent } from '@whiskeysockets/baileys';

let handler = async (m, { conn, text, usedPrefix, command, args }) => {
    let [targetJids, ...messageParts] = args;
    const messageText = messageParts.join(' ');

    if (!targetJids) {
        throw `╔═══❖ *Forward Message* ❖═══╗

📋 *Usage:*
${usedPrefix}${command} <target1,target2,...> <text>

📌 *Examples:*
${usedPrefix}${command} 1234567890,1234567891 Hello Everyone!
${usedPrefix}${command} 1234567890@s.whatsapp.net,9876543210@g.us Check this out!

📝 *Note:* 
• Reply to any message with command to forward media
• Max 50 targets allowed at once
• Use commas to separate multiple numbers`;
    }

    let targets = targetJids.split(',').map(jid => jid.includes('@') ? jid : `${jid}@s.whatsapp.net`);

    if (targets.length > 50) {
        throw `⚠️ Maximum 50 targets allowed! You provided: ${targets.length}`;
    }

    let processedJids = new Set();
    let successCount = 0;
    let failCount = 0;
    
    console.log(`Starting forward for ${targets.length} targets`);

    for (let targetJid of targets) {
        if (processedJids.has(targetJid)) {
            console.log(`Skipping duplicate JID: ${targetJid}`);
            continue;
        }
        processedJids.add(targetJid);
        console.log(`Processing forward to ${targetJid}`);

        if (m.quoted) {
            try {
                const quotedMessage = m.quoted.fakeObj.message;
                if (!quotedMessage) throw 'No message found to forward.';
                console.log('Quoted Message:', quotedMessage);

                const forwardedMessage = generateWAMessageFromContent(targetJid, quotedMessage, {
                    userJid: conn.user.id
                });
                console.log('Forwarded Message:', forwardedMessage);

                await conn.relayMessage(targetJid, forwardedMessage.message, { messageId: forwardedMessage.key.id });
                successCount++;
            } catch (error) {
                console.log(`Failed to forward media to ${targetJid}: ${error.message}`);
                failCount++;
            }
        } else if (messageText) {
            try {
                const message = generateWAMessageFromContent(targetJid, {
                    text: messageText,
                }, {
                    userJid: conn.user.id,
                });
                console.log('Text Message:', message);

                await conn.relayMessage(targetJid, message.message, { messageId: message.key.id });
                successCount++;
            } catch (error) {
                console.log(`Failed to send text to ${targetJid}: ${error.message}`);
                failCount++;
            }
        } else {
            throw `❌ No media or text to forward. Reply to a message or provide text!`;
        }
    }
    
    console.log('Forwarding completed');
    
    // Simple done message
    let doneMsg = `╔═══❖ *Forward Complete* ❖═══╗\n\n`;
    doneMsg += `✅ *Successful:* ${successCount}\n`;
    if (failCount > 0) doneMsg += `❌ *Failed:* ${failCount}\n`;
    doneMsg += `🎯 *Total Targets:* ${targets.length}\n\n`;
    doneMsg += `╚═══ *Powered by Prince Bot* ═══╝`;
    
    await m.reply(doneMsg);
}

handler.help = ['forward <targetJid1,targetJid2,...> [<text> | <media>]'];
handler.tags = ['tools'];
handler.command = /^(forward|frd)$/i;

export default handler;
