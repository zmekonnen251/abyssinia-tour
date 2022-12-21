import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import filterObj from '../utils/filterObj.js';
import APIFeatures from './../utils/apiFeatures.js';

const deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc)
      return next(
        new AppError('No document found with that Id', 404)
      );
    res.status(204).json({
      status: 'Success',
      data: null,
    });
  });

const updateOne = (Model, filter) =>
  catchAsync(async (req, res, next) => {
    const filteredBody = filter
      ? filterObj(req.body, ...filter)
      : req.body;
    const doc = await Model.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!doc) {
      return next(
        new AppError('No document found with that ID', 404)
      );
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

const createOne = (Model, filter) =>
  catchAsync(async (req, res, next) => {
    const filteredBody = filter
      ? filterObj(req.body, ...filter)
      : req.body;

    const doc = await Model.create(filteredBody);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

const getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (populateOptions) query = query.populate(populateOptions);
    const doc = await query.select('-__v');

    if (!doc) {
      return next(
        new AppError('No document found with that ID', 404)
      );
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

const getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    //EXECUTE QUERY
    let filter = {};

    if (req.params.tourId) filter = { tour: req.params.tourId };
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // const doc = await features.query.explain();
    const doc = await features.query;

    //SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: doc.length,

      data: {
        data: doc,
      },
    });
  });

export default {
  createOne,
  deleteOne,
  getAll,
  getOne,
  updateOne,
};
