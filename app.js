const path = require('path');
const express = require('express');
const { formatDistance } = require('date-fns');
const userRouter = require('./src/routes/user-router.js');
const postsRouter = require('./src/routes/posts-router.js');
const authenticate = require('./src/auth/authenticate.js');
const AppGenericError = require('./src/errors/app-generic-error.js');

const PUBLIC_DIR = path.join(__dirname, 'public');
const VIEWS_DIR = path.join(__dirname, 'src/views');

const app = express();

const logReq = (req, res, next) => {
  console.log(`${req.method}: ${req.originalUrl}`);
  next();
};

const injectUrlIntoLocals = (req, res, next) => {
  res.locals.url = req.originalUrl;
  next();
};

const injectDateTimeHumanizerIntoLocals = (req, res, next) => {
  res.locals.humanizeDate = (date) => formatDistance(new Date(), date);
  next();
};

const injectUserIntoLocals = (req, res, next) => {
  res.locals.user = req.user;
  next();
};

const initFlashInSession = (req, res, next) => {
  if (!req.session._appFlash) {
    req.session._appFlash = {};
  }
  next();
};

const injectErrorFlashIntoResLocals = (req, res, next) => {
  const error = req.session._appFlash.error;
  delete req.session._appFlash.error;
  if (error) {
    res.locals.error = error;
  }
  next();
};

authenticate(app);

app.set('views', VIEWS_DIR);
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));
app.use(logReq);
app.use(injectUrlIntoLocals);
app.use(injectUserIntoLocals);
app.use(injectDateTimeHumanizerIntoLocals);
app.use(initFlashInSession);

app.get('/', (req, res) => res.redirect('/posts'));
app.use(injectErrorFlashIntoResLocals);
app.use('/user', userRouter);
app.use('/posts', postsRouter);

const handleAppErrors = (error, req, res, next) => {
  if (!(error instanceof AppGenericError) || error.statusCode === 404) {
    if (error.statusCode === 404) {
      error.name = 'Not Found';
      error.status = 404;
    }
    error.stack = '';
    return next(error);
  }
  req.session._appFlash = { error: error.message };
  res.redirect('/');
};

app.use(handleAppErrors);

if (!process.env.SERVERLESS_FUNCTION) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Running on port ${PORT}`));
}

module.exports = app;
