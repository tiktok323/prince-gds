
export async function before(m, { conn }) {

  const nam = "🟢 Prince✍🏻"
const id_ch = "120363199257221654@newsletter"
 
  global.fwc = {
    contextInfo: {
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: id_ch,
        serverMessageId: 100,
        newsletterName: nam
      }
    }
  }

  //---
  
  //global.business =  await conn.getBusinessProfile(conn.user.jid)
  
  //---
  
  
}
