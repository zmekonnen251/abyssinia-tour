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
      status: 'success',
      data: null,
    });
  });

const updateOne = (Model, filter) =>
  catchAsync(async (req, res, next) => {
    if (
      Model.collection.collectionName === 'users' ||
      Model.collection.collectionName === 'tours'
    )
      if (req.file) req.body.photo = req.file.filename;

    if (Model.collection.collectionName === 'tours') {
      if (req.body.startDates)
        req.body.startDates = JSON.parse(req.body.startDates);
      if (req.body.maxGroupSize)
        req.body.maxGroupSize = parseInt(req.body.maxGroupSize);
      if (req.body.price) req.body.price = parseInt(req.body.price);
      if (req.body.locations)
        req.body.locations = JSON.parse(req.body.locations);
      if (req.body.guides)
        req.body.guides = JSON.parse(req.body.guides);
      if (req.body.duration)
        req.body.duration = parseInt(req.body.duration);
      if (req.body.startLocation)
        req.body.startLocation = JSON.parse(req.body.startLocation);
      if (req.body.public)
        req.body.public = JSON.parse(req.body.public);
    }

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
      data: doc,
    });
  });

const createOne = (Model, filter) =>
  catchAsync(async (req, res, next) => {
    const filteredBody = filter
      ? filterObj(req.body, ...filter)
      : req.body;

    if (Model.collection.collectionName === 'users') {
      filteredBody.passwordChangedAt = Date.now() - 1000;
    }

    const doc = await Model.create(filteredBody);

    if (Model.collection.collectionName === 'users') {
      doc.password = undefined;
      doc.passwordChangedAt = undefined;
      doc.__v = undefined;
    }

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

    if (Model.collection.collectionName === 'users')
      query.select('-active');

    if (Model.collection.collectionName === 'tours')
      query.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt -password -active',
      });

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

      data: doc,
    });
  });

export default {
  createOne,
  deleteOne,
  getAll,
  getOne,
  updateOne,
};
