const { validationResult } = require('express-validator');
const User = require('../model/user')
require('dotenv').config()
const sgMail = require('@sendgrid/mail')
const { Vonage } = require('@vonage/server-sdk')


const vonage = new Vonage({
  apiKey: process.env.VONAGE_KEY,
  apiSecret: process.env.VONAGE_SECRET
})
sgMail.setApiKey(process.env.EMAIL_SENDGRID_KEY)

function isWithinPastSixHours(dateString) {
  var date = new Date(dateString);
  var now = new Date();
  var sixHoursAgo = new Date(now.getTime() - (6 * 60 * 60 * 1000)); // Subtract 6 hours in milliseconds

  return date > sixHoursAgo && date <= now;
}
function generateToken() {
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var token = '';
  for (var i = 0; i < 8; i++) {
    var randomIndex = Math.floor(Math.random() * characters.length);
    token += characters.charAt(randomIndex);
  }
  return token;
}

exports.shareAndUpdateLocation = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const err = new Error('invalid input')
    err.statusCode = 400
    return next(err)
  }

  const longitude = req.body.longitude
  const latitude = req.body.latitude
  const email = req.user.email
  const userName = req.user.name

  if (isNaN(longitude) || isNaN(latitude)) {
    const err = new Error('invalid input')
    err.statusCode = 400
    return next(err)
  }

  const userDoc = await User.findByEmail(email).catch(err => {
    let error = {}
    return next(error)
  })

  const contacts = [...userDoc.contacts]

  const guardian = { ...userDoc.guardian }

  if (userDoc.isInDanger && isWithinPastSixHours(userDoc.lastDanger)) {
    await User.findAndUpdateLocation(email, longitude, latitude)

    return res.status(200).json({ message: "done" })
  }

  if (contacts.length === 0 || Object.keys(guardian).length === 0) {
    const err = new Error('you must have contacts first and guardian')
    err.statusCode = 400
    return next(err)
  }

  const token = generateToken()

  const link = `${process.env.AWS_LINK}/requirement/accloc/${token}`;

  await User.findAndStoreDangerTokenAndLocation(email, token, longitude, latitude)

  const text = `${userName} is in danger, track her ${link}`
  for (let i = 0; i < contacts.length; i++) {
    const { number } = contacts[i];
    await vonage.sms.send({ to: '2' + number, from: "App", text })
      .catch(err => {
        return next({})
      });
    // if (contacts[i].email) {
    //   await sgMail.send({
    //     to: contacts[i].email,
    //     from: 'womansafetygp@gmail.com',
    //     subject: `Welcome to Women Safety App! ${userName} is in Danger!`,
    //     html: `<!DOCTYPE html>
    //                 <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
    //                 <head>
    //                   <meta charset="UTF-8">
    //                   <meta name="viewport" content="width=device-width,initial-scale=1">
    //                   <meta name="x-apple-disable-message-reformatting">
    //                   <title></title>
    //                   <!--[if mso]>
    //                   <noscript>
    //                     <xml>
    //                       <o:OfficeDocumentSettings>
    //                         <o:PixelsPerInch>96</o:PixelsPerInch>
    //                       </o:OfficeDocumentSettings>
    //                     </xml>
    //                   </noscript>
    //                   <![endif]-->
    //                   <style>
    //                     table, td, div, h1, p {font-family: Arial, sans-serif;}
    //                   </style>
    //                 </head>
    //                 <body style="margin:0;padding:0;">
    //                   <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;background:#ffffff;">
    //                     <tr>
    //                       <td align="center" style="padding:0;">
    //                         <table role="presentation" style="width:602px;border-collapse:collapse;border:1px solid #cccccc;border-spacing:0;text-align:left;">
    //                           <tr>
    //                             <td align="center" style="padding:40px 0 30px 0;background:#70bbd9;">
    //                               <img src="https://media.istockphoto.com/id/1303742901/vector/email-marketing-message-concept.jpg?s=612x612&w=0&k=20&c=qQIuqm_xHVMMN-HWy7it-Mw62oNVppQe2ImmoJP499U=" alt="" width="300" style="height:auto;display:block;" />
    //                             </td>
    //                           </tr>
    //                           <tr>
    //                             <td style="padding:36px 30px 42px 30px;">
    //                               <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
    //                                 <tr>
    //                                   <td style="padding:0 0 36px 0;color:#153643;">
    //                                     <h1 style="font-size:24px;margin:0 0 20px 0;font-family:Arial,sans-serif;">${userName} is in Danger, track Her</h1>

    //                                     <p style="margin:0;font-size:16px;line-height:24px;font-family:Arial,sans-serif;"><a href="${link}" style="color:#ee4c50;text-decoration:underline;">Track Her</a>
    //                                     Imprtant Note: click this link peridically in the next 6 hours to get the updated location
    //                                     </p>

    //                                   </td>
    //                                 </tr>

    //                               </table>
    //                             </td>
    //                           </tr>
    //                           <tr>
    //                             <td style="padding:30px;background:#ee4c50;">
    //                               <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;font-size:9px;font-family:Arial,sans-serif;">
    //                                 <tr>
    //                                   <td style="padding:0;width:50%;" align="left">
    //                                     <p style="margin:0;font-size:14px;line-height:16px;font-family:Arial,sans-serif;color:#ffffff;">
    //                                       &reg; Woman Safety, Egypt 2023<br/>
    //                                     </p>
    //                                   </td>
    //                                   <td style="padding:0;width:50%;" align="right">

    //                                   </td>
    //                                 </tr>
    //                               </table>
    //                             </td>
    //                           </tr>
    //                         </table>
    //                       </td>
    //                     </tr>
    //                   </table>
    //                 </body>
    //                 </html>`
    //   })
    // }
  }


  await vonage.sms.send({ to: '2' + guardian.number, from: "App", text })
    .catch(err => {
      return next({})
    });


  sgMail.send({
    to: guardian.email,
    from: 'womansafetygp@gmail.com',
    subject: `Welcome to Women Safety App! ${userName} is in Danger!`,
    html: `<!DOCTYPE html>
                <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width,initial-scale=1">
                  <meta name="x-apple-disable-message-reformatting">
                  <title></title>
                  <!--[if mso]>
                  <noscript>
                    <xml>
                      <o:OfficeDocumentSettings>
                        <o:PixelsPerInch>96</o:PixelsPerInch>
                      </o:OfficeDocumentSettings>
                    </xml>
                  </noscript>
                  <![endif]-->
                  <style>
                    table, td, div, h1, p {font-family: Arial, sans-serif;}
                  </style>
                </head>
                <body style="margin:0;padding:0;">
                  <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;background:#ffffff;">
                    <tr>
                      <td align="center" style="padding:0;">
                        <table role="presentation" style="width:602px;border-collapse:collapse;border:1px solid #cccccc;border-spacing:0;text-align:left;">
                          <tr>
                            <td align="center" style="padding:40px 0 30px 0;background:#70bbd9;">
                              <img src="https://media.istockphoto.com/id/1303742901/vector/email-marketing-message-concept.jpg?s=612x612&w=0&k=20&c=qQIuqm_xHVMMN-HWy7it-Mw62oNVppQe2ImmoJP499U=" alt="" width="300" style="height:auto;display:block;" />
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:36px 30px 42px 30px;">
                              <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
                                <tr>
                                  <td style="padding:0 0 36px 0;color:#153643;">
                                    <h1 style="font-size:24px;margin:0 0 20px 0;font-family:Arial,sans-serif;">${userName} is in Danger, track Her</h1>
                                    
                                    <p style="margin:0;font-size:16px;line-height:24px;font-family:Arial,sans-serif;"><a href="${link}" style="color:#ee4c50;text-decoration:underline;">Track Her</a>
                                    Imprtant Note: click this link peridically in the next 6 hours to get the updated location
                                    </p>
                                    
                                  </td>
                                </tr>
          
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:30px;background:#ee4c50;">
                              <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;font-size:9px;font-family:Arial,sans-serif;">
                                <tr>
                                  <td style="padding:0;width:50%;" align="left">
                                    <p style="margin:0;font-size:14px;line-height:16px;font-family:Arial,sans-serif;color:#ffffff;">
                                      &reg; Woman Safety, Egypt 2023<br/>
                                    </p>
                                  </td>
                                  <td style="padding:0;width:50%;" align="right">
          
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>`
  })



  res.status(200).json({ message: "done" })
}






exports.accessLocation = async (req, res, next) => {

  const token = req.params.token
  if (!token) {

    return res.status(400).send("invalid or expired token")
  }


  const userDoc = await User.findByDangerToken(token).catch(err => {
    let error = {}
    return next(error)
  })

  if (!userDoc) {

    return res.status(400).send("invalid or expired token")


  }
  if (!userDoc.dangerToken || !isWithinPastSixHours(userDoc.lastDanger)) {
    return res.status(400).send("invalid or expired token")
  }



  return res.redirect(`https://www.google.com/maps/search/?api=1&query=${userDoc.latitude},${userDoc.longitude}`)
  // res.status(200).json({ message: "done" })
}

exports.stopLocation = async (req, res, next) => {


  const email = req.user.email

  await User.findAndDeleteLocation(email).catch(err => {
    let error = {}
    return next(error)
  })


  return res.status(200).json({ message: "done" })
}

