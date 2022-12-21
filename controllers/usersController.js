import User from '../models/userModel.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from './../utils/appError.js';
import filterObj from '../utils/filterObj.js';
import factory from './handlerFactory.js';

//Admin can get all users and can update,delete,get and create users

export const getAllUsers = factory.getAll(User);
export const getUser = factory.getOne(User);
export const createUser = factory.createOne(User, [
  'name',
  'email',
  'password',
  'role',
  'passwordConfirm',
]);
export const updateUser = factory.updateOne(User);
export const deleteUser = factory.deleteOne(User);

//A user can update,delete and get his/her profile
export const getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

export const updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

export const deleteMe = catchAsync(async (req, res, next) => {
  const user = User.findById(req.user.id);
  if (!user.active)
    return next(new AppError('User already deleted', 404));

  await User.findByIdAndUpdate(req.user.id, {
    active: false,
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
