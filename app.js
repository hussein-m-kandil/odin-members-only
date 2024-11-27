const path = require('path');
const express = require('express');
const { formatDistance } = require('date-fns');
const userRouter = require('./src/routes/user-router.js');
const postsRouter = require('./src/routes/posts-router.js');
const authenticate = require('./src/auth/authenticate.js');

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

authenticate(app);

app.set('views', VIEWS_DIR);
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));
app.use(logReq);
app.use(injectUrlIntoLocals);
app.use(injectUserIntoLocals);
app.use(injectDateTimeHumanizerIntoLocals);

app.get('/', (req, res) => res.redirect('/posts'));

app.use('/user', userRouter);
app.use('/posts', postsRouter);

if (!process.env.SERVERLESS_FUNCTION) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Running on port ${PORT}`));
}

module.exports = app;
