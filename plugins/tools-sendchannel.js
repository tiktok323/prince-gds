 let handler = async (m, { conn, text, usedPrefix, command, args }) => {
    
    const channelNames = {
        '120363422421446303@newsletter': 'Islamic Channel',
        '120363199257221654@newsletter': 'Prince Updates'
    }

    const getChannelName = (jid) => channelNames[jid] || jid

    // Command based automatic JID
    let targetJids = []
    
    if (/^(postis|islamic)$/i.test(command)) {
        targetJids = ['120363422421446303@newsletter']
    } else if (/^postpb$/i.test(command)) {
        targetJids = ['120363199257221654@newsletter']
    } else {
        let [manualJids, ...messageParts] = args
        if (!manualJids) {
            throw `Usage: ${usedPrefix}${command} <targetJid1,targetJid2,...> [<text> | <media>]`
        }
        args = messageParts
        targetJids = manualJids.split(',').map(jid => jid.includes('@') ? jid : `${jid}@s.whatsapp.net`)
    }

    const messageText = args.join(' ')

    if (targetJids.length > 10) {
        throw `You can only forward to a maximum of 10 channels at once.`
    }

    for (let targetJid of targetJids) {
        const chName = getChannelName(targetJid)
        try {
            if (m.quoted) {
                let media = await m.quoted.download?.()
                if (!media) throw 'Failed to download media!'

                let mime = m.quoted.mtype || m.quoted.mediaType || ''
                let caption = m.quoted.text || ''

                if (/image/i.test(mime)) {
                    await conn.sendMessage(targetJid, { image: media, caption })
                    await m.reply(`✅ Image sent to *${chName}*`)
                } else if (/video/i.test(mime)) {
                    await conn.sendMessage(targetJid, { video: media, caption })
                    await m.reply(`✅ Video sent to *${chName}*`)
                } else if (/audio/i.test(mime)) {
                    await conn.sendMessage(targetJid, {
                        audio: media,
                        mimetype: 'audio/ogg; codecs=opus',
                        ptt: false
                    })
                    await m.reply(`✅ Audio sent to *${chName}*`)
                } else {
                    throw 'Unsupported format! Only image, video, or audio allowed.'
                }

            } else if (messageText) {
                await conn.sendMessage(targetJid, { text: messageText })
                await m.reply(`✅ Text sent to *${chName}*`)
            } else {
                throw 'No media or text to forward.'
            }

        } catch (error) {
            console.error(`Failed to forward to ${targetJid}:`, error)
            await m.reply(`✳️ Failed to send to *${chName}*: ${error.message || error}`)
        }
    }
}

handler.help = ['tochannel <jid> [text|media]', 'postis [text|media]', 'postpb [text|media]']
handler.tags = ['tools']
handler.command = /^(tochannel|sendch|postis|islamic|postpb)$/i
handler.rowner = true

export default handler 
