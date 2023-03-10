import { promisify } from 'util';
import crypto from 'crypto';
import jsonWebtoken from 'jsonwebtoken';
import User from '../models/userModel.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import generateJwtToken from '../utils/generateJwtToken.js';
import Email from '../utils/email.js';
import dotenv from 'dotenv';

dotenv.config();



const createAndSendCookie = (user,res,token) => {
  const cookiesOption = {
 
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    maxAge: new Date(
      Date.now() +
        process.env.REFRESH_TOKEN_COOKIE_EXPIRES_IN * 60 * 1000
    ),
    
  };
    res.cookie('refreshToken', token, cookiesOption);
  }

export const signUp = catchAsync(async (req, res, next) => {
  const {
    name,
    email,
    password,
    passwordConfirm,
    role = 'user',
    passwordChangedAt = Date.now(),
  } = req.body;
  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
    role,
    passwordChangedAt,
  });

  newUser.password = undefined;

  const refreshToken = generateJwtToken('refresh',newUser);
  const accessToken = generateJwtToken('access', newUser);
  
  await User.findByIdAndUpdate(newUser._id, { jwt }, { new: true });

  const url = `${req.protocol}//:${req.get('host')}/profile`;

  await new Email(newUser, url).sendWelcome();

  createAndSendCookie(newUser, res, jwt);
  res.json({accessToken});
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1 ) Check if email and password exist
  if (!email || !password)
    return next(
      new AppError('Please provide email and  password !', 400)
    );

  // 2 ) Check if a User exist && password and email are correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password)))
    return next(new AppError('Incorrect email or password!', 401));

  // 3 ) If everything correct send token to client
  // console.log(user.id, user._id);
  const refreshToken = generateJwtToken('refresh',user);

  const accessToken = generateJwtToken('access', user);

  await User.findByIdAndUpdate(
    user.id,
    { jwt: refreshToken },
    { new: true }
  );

  createAndSendCookie(user, res, refreshToken);
  res.json({accessToken});
});

export const logout = catchAsync(async (req, res, next) => {
  const cookies = req.cookies;

  if (!cookies?.refreshToken) return res.status(204);

  const refreshToken = cookies.refreshToken;

  jsonWebtoken.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,

    async (err, decodedUser) => {
      if (err) return next(new AppError('Forbiden!', 403));

      const foundUser = await User.findById(decodedUser.id);

      if (!foundUser) return next(new AppError('Forbiden!', 403));

      if (String(foundUser._id) !== decodedUser.id)
        return next(new AppError('Forbiden!', 403));

      await User.findByIdAndUpdate(
        foundUser.id,
        { jwt: '' },
        { new: true }
      );

      res.clearCookie('refreshToken');

      res.status(200).json({ status: 'success' });
    }
  );
});

export const protect = catchAsync(async (req, res, next) => {
  // 1) Get token
  const refreshToken = req.cookies['refreshToken'];
  // const accessTokenCookie = req.cookies['accessToken'];

  let accessTokenAuthHeader;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    accessTokenAuthHeader = req.headers.authorization.split(' ')[1];
  }

  if (
    !accessTokenAuthHeader
  ) {
    return next(
      new AppError(
        'You are not logged in! Please login to get access.',
        401
      )
    );
  }
  
  // 2) verify token

  jsonWebtoken.verify(
    accessTokenAuthHeader,
    process.env.ACCESS_TOKEN_SECRET,
    async (err, decodedAccessToken) => {
      if (err) {
        jsonWebtoken.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET,
          async (err, decodedRefreshToken) => {
            if (err) {
              return next(
                new AppError(
                  'You are not logged in! Please login to get access.',
                  401
                )
              );
            }

            const currentUser = await User.findById(
              decodedRefreshToken.id
            );

            if (!currentUser) {
              return next(
                new AppError(
                  'The user belongs to the token does no longer exist.',
                  401
                )
              );
            }

            if (
              currentUser.changedPasswordAfter(
                decodedRefreshToken.iat
              )
            ) {
              return next(
                new AppError(
                  'User recently changed password! Please login again.',
                  401
                )
              );
            }

            const accessToken = generateJwtToken('access', currentUser);

            
            res.json({accessToken});

            req.user = currentUser;
            next();
          }
        );
      } else {
        const currentUser = await User.findById(
          decodedAccessToken._id
        );

        if (!currentUser) {
          return next(
            new AppError(
              'The user belongs to the token does no longer exist.',
              401
            )
          );
        }

        if (
          currentUser.changedPasswordAfter(decodedAccessToken.iat)
        ) {
          return next(
            new AppError(
              'User recently changed password! Please login again.',
              401
            )
          );
        }

        req.user = currentUser;
       

        next();
      }
    }
  );
});

export const restrictTo = (...roles) =>
  catchAsync(async (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          'You do not have permission to perform this action',
          403
        )
      );
    }

    next();
  });

export const forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on posted email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(
      new AppError('There is no user with email address.', 404)
    );
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  const resetURL = `http://localhost:3000/resetPassword/${resetToken}`;
  // const resetURL = `${req.protocol}://${req.get(
  //   'host'
  // )}/api/v1/users/resetPassword/${resetToken}`;

  try {
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});

export const resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token

  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  const accessToken = generateJwtToken('access', user);
  const refreshToken = generateJwtToken('refresh', user);

  await User.findByIdAndUpdate(
    user.id,
    { jwt: refreshToken },
    { new: true }
  );
  
  createAndSendCookie(user, res, refreshToken);
  res.json({accessToken})
});

export const updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct

  if (
    !(await user.correctPassword(
      req.body.passwordCurrent,
      user.password
    ))
  ) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4) Log user in, send JWT
  const accessToken = generateJwtToken('access', user);

  res.json({accessToken})

});
