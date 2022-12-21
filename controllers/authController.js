import { promisify } from 'util';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import generateJwtToken from '../utils/generateJwtToken.js';
import sendEmail from '../utils/email.js';

const cookiesOption = {
  expires: new Date(
    Date.now() +
      process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
  ),
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
};

const createSendToken = (user, statusCode, res) => {
  const token = generateJwtToken('refresh', {
    id: user._id,
    name: user.name,
    email: user.email,
  });

  res.cookie('jwt', token, cookiesOption);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

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

  createSendToken(newUser, 201, res);
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
  createSendToken(user, 200, res);
  // const token = generateJwtToken('refresh', {
  //   id: user.id,
  //   email: user.email,
  //   name: user.name,
  // });

  // res.status(200).json({ status: 'success', token });
});

export const protect = catchAsync(async (req, res, next) => {
  // 1) Get token
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token)
    return next(
      new AppError(
        'You are not logged in! Please login to get access.',
        401
      )
    );
  // 2) verify token

  const decodedRefToken = await promisify(jwt.verify)(
    token,
    process.env.REFRESH_TOKEN_SECRET
  );

  // 3) check if user exist
  const currentUser = await User.findById(decodedRefToken.id);

  if (!currentUser) {
    return next(
      new AppError(
        'The user belongs to the token does no longer exist.',
        401
      )
    );
  }

  // 4) check if user changed password after token was issued
  if (currentUser.changedPasswordAfter(decodedRefToken.iat)) {
    return next(
      new AppError(
        'User recently changed password! Please login again.',
        401
      )
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE

  req.user = currentUser;

  next();
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
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}. \nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message,
    });

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
  createSendToken(user, 200, res);
  // const token = generateJwtToken('refresh', {
  //   id: user.id,
  //   email: user.email,
  //   name: user.name,
  // });

  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });
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
  createSendToken(user, 200, res);
  // const token = generateJwtToken('refresh', {
  //   id: user.id,
  //   email: user.email,
  //   name: user.name,
  // });

  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });
});
