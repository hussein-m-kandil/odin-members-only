const { param, validationResult } = require('express-validator');

module.exports = {
  idValidators: [
    param('id').isInt({ min: 0 }),
    (req, res, next) => {
      return validationResult(req).isEmpty() ? next() : next('route');
    },
  ],
};
