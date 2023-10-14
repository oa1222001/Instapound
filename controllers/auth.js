const { validationResult } = require('express-validator');
const User = require('../model/user')
require('dotenv').config()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const sgMail = require('@sendgrid/mail')
const { OAuth2Client } = require("google-auth-library");
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.AWS_LINK}/auth/google/callback`;

const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);



function generateRandomNumber() {
  let randomNumber = Math.floor(Math.random() * 1000000); // Generates a random integer between 0 and 999999
  let randomString = randomNumber.toString().padStart(6, '0'); // Pads the integer with leading zeros to ensure it has 6 digits
  return randomString;
}

sgMail.setApiKey(process.env.EMAIL_SENDGRID_KEY)


exports.signUp = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const err = new Error('Validation Error')
    // console.log(errors);
    err.statusCode = 400
    return next(err)
  }
  const isEmailExisted = await User.findByEmail(req.body.email).catch(err => {
    let error = {}
    return next(error)
  })

  if (isEmailExisted && isEmailExisted.verifiedEmail) {
    const err = new Error('User Already Existed with email or username, use a new username or email')
    err.statusCode = 400
    return next(err);
  }
  const isUsernameExisted = await User.findByUsername(req.body.username).catch(err => {
    let error = {}
    return next(error)
  })

  if (isUsernameExisted && isUsernameExisted.verifiedEmail) {
    const err = new Error('User Already Existed with email or username, use a new username or email')
    err.statusCode = 400
    return next(err);
  }


  await User.findAndDeleteUnverified(req.body.email, req.body.username)


  const salt = await bcrypt.genSalt(12)
  req.body.password = await bcrypt.hash(req.body.password, salt)

  const verifyEmailToken = jwt.sign({ email: req.body.email, username: req.body.username }, process.env.JWT_SECRET, {})


  const user = new User(
    req.body.name,
    req.body.email,
    req.body.password,
    verifyEmailToken,
    req.body.username
  )
  await user.save()
  await sgMail.send({
    to: req.body.email,
    from: 'womansafetygp@gmail.com',
    subject: 'Welcome to Instapound App! Confirm Your Email',
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
                            <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSfU1BZ6pNZ3zlJXLRbhRoLo3K1bz1WrteGzQ&usqp=CAU" alt="" width="300" style="height:auto;display:block;" />
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:36px 30px 42px 30px;">
                            <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
                              <tr>
                                <td style="padding:0 0 36px 0;color:#153643;">
                                  <h1 style="font-size:24px;margin:0 0 20px 0;font-family:Arial,sans-serif;">Confirm your email</h1>
                                  <p style="margin:0 0 12px 0;font-size:16px;line-height:24px;font-family:Arial,sans-serif;">
              You're on your way!
              Let's confirm your email address.
              By clicking on the following link, you are confirming your email address.
        
              Confirm Email Address</p>
                                  <p style="margin:0;font-size:16px;line-height:24px;font-family:Arial,sans-serif;"><a href="${process.env.AWS_LINK + '/auth/emailverify/' + verifyEmailToken}" style="color:#ee4c50;text-decoration:underline;">Confirm Email now</a></p>
                                  
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
                                    &reg; Instapound, Egypt 2023<br/>
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

exports.googleAuth = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const err = new Error('Invalid token')
    err.statusCode = 400
    return next(err)
  }
  const token = req.body.token;


  try {
    // Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });

    // Extract the user information from the verified token
    const payload = ticket.getPayload();

    let user;

    const isEmailExisted = await User.findByEmail(payload.email).catch(err => {
      let error = {}
      return next(error)
    })

    if (isEmailExisted) {
      if (!isEmailExisted.verifiedEmail) {
        await User.findAndVerifyEmail(isEmailExisted.email, isEmailExisted.username).catch(err => {
          e = {};
          next({})
        })
        //this is for delete any document that has same email but with different number and not verified
        await User.findAndDeleteUnverified(isEmailExisted.email, isEmailExisted.username).catch(err => {
          e = {};
          next({})
        })
      }
      user = isEmailExisted;
    }
    else {
      await User.findAndDeleteUnverified(payload.email)
      let username;

      const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

      while (true) {
        let randomString = '';

        for (let i = 0; i < 6; i++) {
          const randomIndex = Math.floor(Math.random() * randomChars.length);
          randomString += randomChars.charAt(randomIndex);
        }

        username = payload.given_name + "_" + payload.family_name + "_" + randomString;
        const isUsernameExisted = await User.findByUsername(username).catch(err => {
          let error = {}
          return next(error)
        })
        if (!isUsernameExisted) {
          break;
        }
      }


      user = new User(
        payload.name,
        payload.email,
        '',
        '',
        username,
        true,
        payload.picture
      )
      await user.save()
    }

    await User.findAndUpdateFcmToken(user.email, req.body.fcmToken)



    const res_token = jwt.sign({ email: user.email, username: user.username, name: user.name }, process.env.JWT_SECRET, {})

    res.status(200).json({ user: { name: user.name, email: user.email, username: user.username, image: user.image, chats: user.chats, following: user.following }, token: res_token })
  } catch (error) {
    res.status(400).json({ error: 'Invalid token' });
  }
}

exports.login = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const err = new Error('Wrong Credentials')
    err.statusCode = 400
    return next(err)
  }

  const { username, password } = req.body

  const user = await User.findByUsername(username).catch(err => {
    let error = {}
    return next(error)
  })

  if (!user) {
    const err = new Error('Wrong Credentials')
    err.statusCode = 400
    return next(err)
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password)
  if (!isPasswordCorrect) {
    const err = new Error('Wrong Credentials')
    err.statusCode = 400
    return next(err)
  }
  if (!user.verifiedEmail) {
    const err = new Error('please verify email and phone number, or you could signup again with different email or phone number')
    err.statusCode = 400
    return next(err)
  }

  const token = jwt.sign(
    { email: user.email, username: user.username, name: user.name },
    process.env.JWT_SECRET,
    {}
  )
  await User.findAndUpdateFcmToken(user.email, req.body.fcmToken)
  res.status(200).json({ user: { name: user.name, email: user.email, username: user.username, image: user.image, chats: user.chats, following: user.following, followers: user.followers }, token })
}

exports.verifyEmail = async (req, res, next) => {



  const token = req.params.token;
  if (!token) {
    // const err = new Error('Enter a token to verify your email')
    // err.statusCode = 401
    // return next(err)
    return res.status(400).send(`Wrong Token
    Either expired or wrong token`)
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (!payload.email || !payload.username) {
      // const err = new Error('Bad Token.')
      // err.statusCode = 401
      // return next(err)
      return res.status(400).send(`Wrong Token
    Either expired or wrong token`)
    }
    await User.findAndVerifyEmail(payload.email, payload.username).catch(err => {
      e = {};
      next({})
    })
    //this is for delete any document that has same email but with different number and not verified
    await User.findAndDeleteUnverified(payload.email, payload.username)

    res.status(200).send('Verified')

  } catch (error) {
    let e = {}
    return next(e)
  }
}

exports.forgotPass = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const err = new Error("some fields are missed or email doesn't exist")
    err.statusCode = 400
    return next(err)
  }

  const user = await User.findByEmail(req.body.email).catch(err => {
    next({})
  })

  if (!user) {
    const err = new Error("some fields are missed or email doesn't exist")
    err.statusCode = 400
    return next(err)
  }
  if (!user.verifiedEmail) {
    const err = new Error("some fields are missed or email doesn't exist")
    err.statusCode = 400
    return next(err)
  }


  const token = generateRandomNumber()

  await User.saveForgotPasswordToken(req.body.email, token)


  sgMail.send({
    to: req.body.email,
    from: 'womansafetygp@gmail.com',
    subject: 'Welcome to Instapound App! Reset Your Password',
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
                            <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSfU1BZ6pNZ3zlJXLRbhRoLo3K1bz1WrteGzQ&usqp=CAU" alt="" width="300" style="height:auto;display:block;" />
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:36px 30px 42px 30px;">
                            <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
                              <tr>
                                <td style="padding:0 0 36px 0;color:#153643;">
                                  <h1 style="font-size:24px;margin:0 0 20px 0;font-family:Arial,sans-serif;">Reset Your Password</h1>
                                  <p style="margin:0 0 12px 0;font-size:16px;line-height:24px;font-family:Arial,sans-serif;">
              You're on your way!
              Let's reset your password.
              Your reset token is ${token}
        
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
                                    &reg; Instapound, Egypt 2023<br/>
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

exports.verifyForgotPass = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const err = new Error('Validation Error')
    err.statusCode = 400
    return next(err)
  }
  const token = req.body.token;

  try {

    const user = await User.findForgotPasswordTokenUser(token).catch(err => {
      next({})
    })

    if (!user) {
      const err = new Error("User does not exist or wrong token or user is unverified")
      err.statusCode = 400
      return next(err)
    }
    if (!user.verifiedEmail || !user.forgotPasswordToken) {
      const err = new Error("User does not exist or wrong token or user is unverified")
      err.statusCode = 400
      return next(err)
    }

    const salt = await bcrypt.genSalt(12)
    const newPassword = await bcrypt.hash(req.body.password, salt)

    await User.deleteForgotPasswordTokenAndSavePassword(token, user.email, newPassword)

    res.status(200).json({ message: 'done' })
  } catch (error) {
    return next({})
  }

}

