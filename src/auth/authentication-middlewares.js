function preventUnauthenticatedOps(req, res, next) {
  if (!req.isAuthenticated()) {
    const error = new Error();
    error.stack = '';
    error.status = 404;
    error.name = 'Not Found';
    error.statusCode = error.status;
    throw error;
  }
  next();
}

module.exports = {
  preventUnauthenticatedOps,
};
