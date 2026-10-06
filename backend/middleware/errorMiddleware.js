const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  // Errors raised by Express itself (e.g. a missing static file) carry a status
  let statusCode =
    res.statusCode === 200 ? err.status || err.statusCode || 500 : res.statusCode;
  let message = err.message;

  // Malformed ids, schema violations and duplicate keys are client errors
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid id";
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  } else if (err.code === 11000) {
    statusCode = 400;
    message = "User already exists";
  } else if (err.type === "entity.too.large") {
    message = "Request is too large";
  } else if (err.type === "entity.parse.failed") {
    message = "Invalid JSON";
  } else if (statusCode === 404 && err.code === "ENOENT") {
    message = `Not Found - ${req.originalUrl}`;
  }

  res.status(statusCode);
  res.json({
    message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };
